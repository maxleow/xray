const utils = {
    _keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
    _utf8_encode: (string) => {
        string = string.replace(/\r\n/g, "\n");
        let utftext = "";

        for (let n = 0; n < string.length; n++) {
            const c = string.charCodeAt(n);
            if (c < 128) {
                utftext += String.fromCharCode(c);
            } else if ((c > 127) && (c < 2048)) {
                utftext += String.fromCharCode((c >> 6) | 192);
                utftext += String.fromCharCode((c & 63) | 128);
            } else {
                utftext += String.fromCharCode((c >> 12) | 224);
                utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                utftext += String.fromCharCode((c & 63) | 128);
            }
        }
        return utftext;
    },
    encode: (input) => {
        let output = "";
        let i = 0;
        input = utils._utf8_encode(input);

        while (i < input.length) {
            const chr1 = input.charCodeAt(i++);
            const chr2 = input.charCodeAt(i++);
            const chr3 = input.charCodeAt(i++);

            const enc1 = chr1 >> 2;
            const enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
            const enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
            const enc4 = chr3 & 63;

            const enc2Enc4 = isNaN(chr2) ? 64 : enc2;
            const enc3Enc4 = isNaN(chr3) ? 64 : enc3;

            output += utils._keyStr.charAt(enc1) + utils._keyStr.charAt(enc2Enc4) +
                utils._keyStr.charAt(enc3Enc4) + utils._keyStr.charAt(enc4);
        }
        return output;
    },
    loginXray: (ctx) => { 
        const pm = ctx.pm
        let xrayClientId = pm.environment.get("xray_client_id");
        let xrayClientSecret = pm.environment.get("xray_client_secret");
        if (!xrayClientId || !xrayClientSecret) {
            ctx.console.log("Skip Login Xray: no client_id or client_secret.");
            return;
        }

        let token_key = 'xray_token';
        let token = pm.variables.get(token_key);
        if (token) return token;

        pm.sendRequest({
            url: "https://xray.cloud.getxray.app/api/v2/authenticate",
                method: "POST",
                header: {"Content-Type": "application/json"},
                body: {
                    mode: 'raw',
                    raw: JSON.stringify({
                        "client_id": xrayClientId,
                        "client_secret": xrayClientSecret
                    })
                }
        }, function (err, response) {
            ctx.console.log("error: " + err);
            token = response.json();
            pm.variables.set(token_key, token);
        });

        return pm.variables.get(token_key);
     },
     export_result: (ctx, result) => {
        pm = ctx.pm
        const import_xray = Boolean(pm.environment.get("xray_enabled"));
        if (!import_xray) return;
    
        const regex = /[A-Z]{2,}-\d+/g;
        const matches = pm.info.requestName.match(regex);
        if (!matches) {
            ctx.console.log("skipping Xray result import: no matched ticket.");
            return;
        }
    
        const test_run_key = pm.environment.get("xray_testrun_key") || pm.collectionVariables.get("xray_testrun_key");
        const requestCondition = pm.request.method === "GET" || pm.request.method === "DELETE";
        let requestBody, responseBody;
    
        try {
            requestBody = requestCondition ? {} : JSON.parse(pm.request.body.raw);
            responseBody = pm.response.code === 204 ? {} : pm.response.json();
        } catch (error) {
            requestBody = {};
            responseBody = {};
        }
    
        const evidenceData = {
            requestUrl: pm.request.url.toString(),
            requestParams: pm.request.url.getQueryString(),
            requestHeader: pm.request.headers,
            requestBody: requestBody,
            responseHeader: pm.response.headers,
            responseBody: responseBody,
            responseCode: pm.response.code
        };
    
        const evidences = this.encode(JSON.stringify(evidenceData));
    
        pm.sendRequest({
            url: "https://xray.cloud.getxray.app/api/v2/import/execution",
            method: "POST",
            header: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + this.loginXray(pm)
            },
            body: {
                mode: 'raw',
                raw: JSON.stringify({
                    "testExecutionKey": test_run_key,
                    "tests": [
                        {
                            "testKey": matches[0],
                            "comment": "This is an automated execution from Postman.",
                            "status": result,
                            "evidence": [{
                                "data": evidences,
                                "filename": test_run_key + "_" + matches[0] + "_" + (new Date()).toISOString() + ".json",
                                "contentType": "application/json"
                            }]
                        }
                    ]
                })
            }
        }, function (err, response) {
            ctx.console.log("error: " + err);
            ctx.console.log(response.json());
        });
    },
    
    loginCsg: (ctx) => { 
        const pm = ctx.pm;
        let expiresInTime = pm.environment.get("ExpiresInTime");
        let authUrl = pm.environment.get("Auth_Url");
        let clientId = pm.environment.get("client_id");
        let clientSecret = pm.environment.get("client_secret");

        let accessToken = pm.collectionVariables.get("OAuth_Token");
        let tokenTimestamp = pm.collectionVariables.get("OAuth_Timestamp");

        if (!clientId || !clientSecret) {
            ctx.console.log("skipping CSG Login");
            return;
        }

        // Refresh the OAuth token if necessary
        let tokenDate = new Date(2022,1,1);
        if(tokenTimestamp){
            tokenDate = Date.parse(tokenTimestamp);
        }
        
        if((new Date() - tokenDate) >= expiresInTime || !accessToken){
            pm.sendRequest({
                url:  authUrl,
                method: 'POST',
                header: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: {      
                    mode: 'urlencoded',
                    urlencoded: [
                        {key: "grant_type", value: "client_credentials"},
                        {key:"client_id", value: clientId},
                        {key:"client_secret", value: clientSecret},
                    ]
                }
            }, function (err, res) {
                    accessToken = res.json().access_token;
                    pm.collectionVariables.set("OAuth_Token", accessToken);
                    pm.collectionVariables.set("OAuth_Timestamp", new Date());
                    
                    // Set the ExpiresInTime variable to the time given in the response if it exists
                    if(res.json().expires_in){
                        expiresInTime = res.json().expires_in * 1000;
                    }
                    pm.environment.set("ExpiresInTime", expiresInTime);
                    pm.request.headers.add("Authorization: Bearer " + accessToken);
            });
        } else {
            pm.request.headers.add("Authorization: Bearer " + accessToken);
        }
     },
    init: (ctx) => {
        const pm = ctx.pm;
        utils.loginXray(pm);
        utils.loginCsg(pm);
        ctx.console.log("initialized");
    }
};