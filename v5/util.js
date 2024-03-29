{
    _keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
    _utf8_encode: function(string){
        string = string.replace(/\r\n/g,"\n");
        let utftext = "";
    
        for (let n = 0; n < string.length; n++) {
    
            let c = string.charCodeAt(n);
    
            if (c < 128) {
                utftext += String.fromCharCode(c);
            }
            else if((c > 127) && (c < 2048)) {
                utftext += String.fromCharCode((c >> 6) | 192);
                utftext += String.fromCharCode((c & 63) | 128);
            }
            else {
                utftext += String.fromCharCode((c >> 12) | 224);
                utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                utftext += String.fromCharCode((c & 63) | 128);
            }
    
        }
    
        return utftext;
    },
    encode: function(input) {
        let output = "";
        let chr1, chr2, chr3, enc1, enc2, enc3, enc4;
        let i = 0;
    
        input = this._utf8_encode(input);
    
        while (i < input.length) {
    
            chr1 = input.charCodeAt(i++);
            chr2 = input.charCodeAt(i++);
            chr3 = input.charCodeAt(i++);
    
            enc1 = chr1 >> 2;
            enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
            enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
            enc4 = chr3 & 63;
    
            if (isNaN(chr2)) {
                enc3 = enc4 = 64;
            } else if (isNaN(chr3)) {
                enc4 = 64;
            }
    
            output = output +
            this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
            this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);
    
        }
    
        return output;
    },
    loginXray: function(pm){
        let xrayClientId = pm.environment.get("xray_client_id");
        let xrayClientSecret = pm.environment.get("xray_client_secret");
        if (!xrayClientId || !xrayClientSecret) {
            console.log("Skip Login Xray: no client_id or client_secret.");
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
            token = response.json();
            pm.variables.set(token_key, token);
        });

        return pm.variables.get(token_key);
    },
    export_result: function(pm, result){
        let import_xray = Boolean(pm.environment.get("xray_enabled"));
        if (!import_xray) return;

        const regex = /[A-Z]{2,}-\d+/g;
        let matches = pm.info.requestName.match(regex);
        if (!matches) {
            console.log("skipping Xray result import: no matched ticket.");
            return;
        };

        let test_run_key = pm.environment.get("xray_testrun_key") || pm.collectionVariables.get("xray_testrun_key");
        let evidences = this.encode(JSON.stringify({
            requestUrl: pm.request.url.toString(),
            requestParams: pm.request.url.getQueryString(),
            requestHeader: pm.request.headers,
            requestBody: {},
            responseHeader: pm.response.headers,
            responseBody: {},
            responseCode: pm.response.code
        }));
        
        try {
            evidences = this.encode(JSON.stringify({
                requestUrl: pm.request.url.toString(),
                requestParams: pm.request.url.getQueryString(),
                requestHeader: pm.request.headers,
                requestBody: (pm.request.method === "GET")? {} : JSON.parse(pm.request.body.raw),
                responseHeader: pm.response.headers,
                responseBody: (pm.request.code === 204)? {} :pm.response.json(),
                responseCode: pm.response.code
            }));
        } catch (error) {
            evidences = this.encode(JSON.stringify({
                requestUrl: pm.request.url.toString(),
                requestParams: pm.request.url.getQueryString(),
                requestHeader: pm.request.headers,
                requestBody: (pm.request.method === "GET")? {} : JSON.parse(pm.request.body.raw),
                responseHeader: pm.response.headers,
                responseBody: {},
                responseCode: pm.response.code
            }));
        }

        pm.sendRequest(
            {
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
                        "tests" : [
                            {
                                "testKey" : matches[0],
                                "comment" : "This is an automated execution from Postman.",
                                "status" : result,
                                "evidence": [{
                                    "data": evidences,
                                    "filename": test_run_key + "_" + matches[0] + "_" + (new Date()).toISOString() + ".json",
                                    "contentType":"application/json"
                                }]
                            }
                        ]
                    })
                }
            },
            function (err, response) {
                console.log(response.json());
            }
        );
    },
    loginCsg: function(pm) {
        
        let expiresInTime = pm.environment.get("ExpiresInTime");
        let authUrl = pm.environment.get("Auth_Url");
        let clientId = pm.environment.get("client_id");
        let clientSecret = pm.environment.get("client_secret");

        let accessToken = pm.collectionVariables.get("OAuth_Token");
        let tokenTimestamp = pm.collectionVariables.get("OAuth_Timestamp");

        if (!clientId || !clientSecret) {
            console.log("skipping CSG Login");
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
    init: function(pm){
      this.loginXray(pm);
      this.loginCsg(pm);
      console.log("initialized");
    }
}
