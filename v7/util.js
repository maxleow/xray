const utils = {
    isValidMalaysianID: (id) => {
        // Check if the input is a string with 12 digits.
        if (typeof id !== 'string' || id.length !== 12) {
          return false;
        }
      
        // Check if all characters are digits.
        if (!/^\d{12}$/.test(id)) {
          return false;
        }
      
        // Extract year, month, and day.
        const year = parseInt(id.substring(0, 2), 10) + 1900;
        const month = parseInt(id.substring(2, 4), 10);
        const day = parseInt(id.substring(4, 6), 10);
      
        // Check if the date is valid.
        const date = new Date(year, month - 1, day);
        if (date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day) {
          return false;
        }
      
        // Check if the fourth pair is less than or equal to 99.
        const fourthPair = parseInt(id.substring(6, 8), 10);
        if (fourthPair > 99) {
          return false;
        }
      
        // Check if the ninth through eleventh digit follows the specified rule.
        const specialNumber = parseInt(id.substring(8, 11), 10);
        if (year <= 1999) {
          if (specialNumber < 500 || specialNumber > 799) {
            return false;
          }
        } else {
          if (specialNumber < 0 || specialNumber > 399) {
            return false;
          }
        }
      
        return true;
    },
    getDateFromNIRC: (ctx, id) => {
        ctx.console.log(id);
        id = String(id);
        if (!id || id.length !== 12) {
          throw new Error('Invalid ID format');
        }
      
        const year = parseInt(id.substring(0, 2), 10) + 1900;
        ctx.console.log(year);

        const month = id.substring(2, 4);
        ctx.console.log(month);
        
        const day = id.substring(4, 6);
        ctx.console.log(day);
      
        return { year, month, day };
    },
    generateRandomNIRC: () => {
        const getRandomInt = (min, max) => {
            min = Math.ceil(min);
            max = Math.floor(max);
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }
          
        // Generate random year, month, and day.
        const year = getRandomInt(0, 99);
        const month = getRandomInt(1, 12);
        const maxDay = new Date(2000 + year, month, 0).getDate();
        const day = getRandomInt(1, maxDay);

        // Generate fourth pair.
        const fourthPair = getRandomInt(0, 99);

        // Generate special number based on the birth year.
        let specialNumber;
        if (year <= 99) {
            specialNumber = getRandomInt(500, 799);
        } else {
            specialNumber = getRandomInt(0, 399);
        }

        // Generate the last digit.
        const lastDigit = getRandomInt(0, 9);

        // Build the ID number string.
        const id = [
            year.toString().padStart(2, '0'),
            month.toString().padStart(2, '0'),
            day.toString().padStart(2, '0'),
            fourthPair.toString().padStart(2, '0'),
            specialNumber.toString().padStart(3, '0'),
            lastDigit,
        ].join('');

        return id;
    },
    
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
        const keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
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

            output += keyStr.charAt(enc1) + keyStr.charAt(enc2Enc4) +
                keyStr.charAt(enc3Enc4) + keyStr.charAt(enc4);
        }
        return output;
    },
    loginXray: (ctx) => { 
        const pm = ctx.pm
        ctx.console.log("Logging in to Xray.")
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
            if (err){
                ctx.console.log("error: " + err);
            }
            token = response.json();
            pm.variables.set(token_key, token);
        });

        return pm.variables.get(token_key);
     },
     export_result: (ctx, result) => {
        pm = ctx.pm
        ctx.console.log("Exporting result to Xray");
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
            ctx.console.log("error: " + err);
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
    
        const evidences = utils.encode(JSON.stringify(evidenceData));
    
        pm.sendRequest({
            url: "https://xray.cloud.getxray.app/api/v2/import/execution",
            method: "POST",
            header: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + utils.loginXray(ctx)
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
            if (err){
                ctx.console.log("error: " + err);
            }
            ctx.console.log(response.json());
        });
    },
    
    loginCsg: (ctx) => { 
        const pm = ctx.pm;
        ctx.console.log("Logging to CSG");
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
                    if (err){
                        ctx.console.log("error: " + err);
                    }
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
        utils.loginXray(ctx);
        utils.loginCsg(ctx);
        ctx.console.log("initialized");
    }
};
return utils;