{
    login: function(pm){
        let token_key = 'xray_token';
        let token = pm.globals.get(token_key);
        if (token) return token;

        pm.sendRequest({
            url: "https://xray.cloud.getxray.app/api/v2/authenticate",
                method: "POST",
                header: {"Content-Type": "application/json"},
                body: {
                    mode: 'raw',
                    raw: JSON.stringify({
                        "client_id": pm.environment.get("xray_client_id"),
                        "client_secret": pm.environment.get("xray_client_secret")
                    })
                }
        }, function (err, response) {
            token = response.json();
            pm.globals.set(token_key, token);
        });

        return pm.globals.get(token_key);
    },
    export_result: function(pm, result){
        let import_xray = Boolean(pm.environment.get("xray_enabled"));
        if (!import_xray) return;

        const regex = /[A-Z]{2,}-\d+/g;
        let matches = pm.info.requestName.match(regex);
        if (!matches) return;

        let test_run_key = pm.collectionVariables.get("xray_testrun_key");

        let evidences = btoa(JSON.stringify({
            requestHeader: pm.request.headers,
            requestBody: pm.request.body,
            responseHeader: pm.response.headers,
            responseBody: pm.responseBody,
            responseCode: pm.response.code
        }));

        pm.sendRequest(
            {
                url: "https://xray.cloud.getxray.app/api/v2/import/execution",
                method: "POST",
                header: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + this.login(pm)
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
                                    "filename": "request-and-response.json",
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
    init: function(pm){
      this.login(pm);
      console.log("initialized");
    }
}
