const utils = {
  attach_evidence_to_jira: (ctx, jira_key, evidence, filename) => {
    const pm = ctx.pm;
    const text = JSON.stringify(evidence, null, 2);
    const auth = ctx.btoa(
      `${pm.environment.get("jira_account_email")}:${pm.environment.get(
        "jira_token"
      )}`
    );
    const boundary = "----WebKitFormBoundary" + Date.now().toString(16);

    const formData = [
      "--" + boundary,
      'Content-Disposition: form-data; name="file"; filename="' +
        filename +
        '"',
      "Content-Type: application/octet-stream",
      "",
      text.toString("base64"),
      "--" + boundary + "--",
    ].join("\r\n");

    pm.sendRequest(
      {
        url: `https://${pm.environment.get(
          "jira_url"
        )}/rest/api/3/issue/${jira_key}/attachments`,
        method: "POST",
        header: {
          Authorization: `Basic ${auth}`,
          Accept: "application/json",
          "X-Atlassian-Token": "no-check",
          "Content-Type": "multipart/form-data; boundary=" + boundary,
        },
        body: {
          mode: "raw",
          raw: formData,
        },
      },
      (err, res) => {
        if (err) {
          ctx.console.error("Error:", err);
        } else {
          ctx.console.log("Status code:", res.code);
          ctx.console.log("Response body:", res.text());
        }
      }
    );
  },
  tests: {
    start: (ctx, cases) => {
      Object.entries(cases).forEach(([testName, testFunction]) => {
        const pm = ctx.pm;
        pm.variables.set("result", "FAILED");
        pm.test(testName, () => {
          let runs = pm.variables.get(pm.info.requestName);
          if (!runs) {
            runs = { cases: [] };
          }
          let run = {
            testName: testName,
            status: null,
            error: null,
          };
          try {
            testFunction();
            run["status"] = "PASSED";
            runs["cases"].push(run);
            ctx.console.log("Cases:", runs);
            const hasFailed = runs["cases"].some(
              (caseItem) => caseItem.status === "FAILED"
            );
            const result = hasFailed ? "FAILED" : "PASSED";
            pm.variables.set("result", result);
          } catch (error) {
            ctx.console.log(error);
            run["status"] = "FAILED";
            run["error"] = error;
            runs["cases"].push(run);
            throw error;
          } finally {
            pm.variables.set(pm.info.requestName, runs);
          }
        });
      });
    },
  },
  isValidMalaysianID: (id) => {
    // Check if the input is a string with 12 digits.
    if (typeof id !== "string" || id.length !== 12) {
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
    if (
      date.getFullYear() !== year ||
      date.getMonth() + 1 !== month ||
      date.getDate() !== day
    ) {
      return false;
    }

    // Check if the fourth pair is less than or equal to 99.
    const fourthPair = parseInt(id.substring(6, 8), 10);
    const pbCodesMalaysia = [
      "01",
      "02",
      "03",
      "04",
      "05",
      "06",
      "07",
      "08",
      "09",
      "10",
      "11",
      "12",
      "13",
      "14",
      "15",
      "16",
      "21",
      "22",
      "23",
      "24",
      "25",
      "26",
      "27",
      "28",
      "29",
      "30",
      "31",
      "32",
      "33",
      "34",
      "35",
      "36",
      "37",
      "38",
      "39",
      "40",
      "41",
      "42",
      "43",
      "44",
      "45",
      "46",
      "47",
      "48",
      "49",
      "50",
      "51",
      "52",
      "53",
      "54",
      "55",
      "56",
      "57",
      "58",
      "59",
    ];
    if (!pbCodesMalaysia.includes(fourthPair.toString().padStart(2, "0"))) {
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
  getDateFromNIRC: (id) => {
    if (!id || id.length !== 12) {
      throw new Error("Invalid ID format");
    }
  
    let year = parseInt(id.substring(0, 2), 10);
    const currentYear = new Date().getFullYear();
    const currentShortYear = currentYear % 100; // get the last two digits of the current year
  
    if (year <= currentShortYear) {
      year += 2000;
    } else {
      year += 1900;
    }
  
    const month = id.substring(2, 4);
    const day = id.substring(4, 6);
  
    if (year > currentYear) {
      throw new Error("The year cannot be in the future");
    }
  
    return { year, month, day };
  },
  generateRandomNIRC: (
    startYear = 1980,
    bornAbroad = false,
    pbCodeParam = undefined
  ) => {
    const getRandomInt = (min, max) => {
      min = Math.ceil(min);
      max = Math.floor(max);
      return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    // Array of all valid PB codes
    const pbCodesMalaysia = [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 21, 22, 23, 24, 25,
      26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43,
      44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59,
    ];

    const pbCodesAbroad = [
      60, 61, 62, 63, 64, 65, 66, 67, 68, 71, 72, 74, 75, 76, 77, 78, 79, 82,
      83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 98, 99,
    ];

    const currentYear = new Date().getFullYear();
    const endYear = currentYear - 13;
    // Generate random year, month, and day.
    const year = getRandomInt(startYear, endYear).toString().slice(-2);
    const month = getRandomInt(1, 12);
    const maxDay = new Date(2000 + year, month, 0).getDate();
    const day = getRandomInt(1, maxDay);

    // Generate place of birth.
    const pbCode = pbCodeParam
      ? pbCodeParam
      : bornAbroad
      ? pbCodesAbroad[getRandomInt(0, pbCodesAbroad.length - 1)]
      : pbCodesMalaysia[getRandomInt(0, pbCodesMalaysia.length - 1)];
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
      year.toString().padStart(2, "0"),
      month.toString().padStart(2, "0"),
      day.toString().padStart(2, "0"),
      pbCode.toString().padStart(2, "0"),
      specialNumber.toString().padStart(3, "0"),
      lastDigit,
    ].join("");

    return id;
  },

  generatePassportNumber: ()=> {
    function getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    function getRandomPrefix() {
        const prefixes = ['A', 'H', 'K'];
        const randomIndex = getRandomInt(0, prefixes.length - 1);
        return prefixes[randomIndex];
    }
    const prefix = getRandomPrefix();
    const randomDigits = getRandomInt(10000000, 99999999);
    return prefix + randomDigits;
},

getRandomName: () => {
  const names = {
    english: {
      given: ["John", "Sarah", "Alex", "Emily", "David", "Jessica"],
      middle: ["James", "Anne", "Michael", "Rose", "Patrick", "Marie"],
      family: ["Smith", "Johnson", "Williams", "Brown", "Taylor", "Anderson"],
    },
    chinese: {
      given: ["Li", "Wang", "Zhang", "Liu", "Chen", "Yang"],
      middle: ["Wei", "Yan", "Jie", "Ying", "Jun", "Fang"],
      family: ["Li", "Wang", "Zhang", "Liu", "Chen", "Yang"],
    },
    indian: {
      given: ["Raj", "Sunita", "Amit", "Priya", "Vijay", "Lakshmi"],
      middle: ["Kumar", "Devi", "Prasad", "Kumari", "Lal", "Bai"],
      family: ["Sharma", "Patel", "Singh", "Kumar", "Gupta", "Verma"],
    },
    malay: {
      given: ["Ahmad", "Siti", "Rahman", "Fatimah", "Ismail", "Aishah"],
      middle: ["Bin", "Binti", "Binte", "Bin", "Binti", "Binte"],
      family: ["Abdullah", "Rahman", "Hassan", "Hussein", "Ali", "Ismail"],
    },
  };

  const groups = Object.keys(names);
  const randomGroup = groups[Math.floor(Math.random() * groups.length)];

  const randomGivenName =
    names[randomGroup].given[
      Math.floor(Math.random() * names[randomGroup].given.length)
    ];
  const randomMiddleName =
    names[randomGroup].middle[
      Math.floor(Math.random() * names[randomGroup].middle.length)
    ];
  const randomFamilyName =
    names[randomGroup].family[
      Math.floor(Math.random() * names[randomGroup].family.length)
    ];

  return{
      givenName: randomGivenName,
      middleName: randomMiddleName,
      familyName: randomFamilyName,
    };
  },
  _utf8_encode: (string) => {
    string = string.replace(/\r\n/g, "\n");
    let utftext = "";

    for (let n = 0; n < string.length; n++) {
      const c = string.charCodeAt(n);
      if (c < 128) {
        utftext += String.fromCharCode(c);
      } else if (c > 127 && c < 2048) {
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
    const keyStr =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
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

      output +=
        keyStr.charAt(enc1) +
        keyStr.charAt(enc2Enc4) +
        keyStr.charAt(enc3Enc4) +
        keyStr.charAt(enc4);
    }
    return output;
  },
  loginXray: (ctx) => {
    const pm = ctx.pm;
    
    const xrayClientId = pm.environment.get("xray_client_id");
    const xrayClientSecret = pm.environment.get("xray_client_secret");
    const xrayEnabled = pm.environment.get("xray_enabled");
    
    ctx.console.log(xrayEnabled, typeof(xrayEnabled));
    if (!xrayClientId || !xrayClientSecret || xrayEnabled !== "true") {
      ctx.console.log("Skip Login Xray: no client_id or client_secret.");
      return;
    }

    let token_key = "xray_token";
    const token = pm.variables.get(token_key);
    if (token) return token;

    pm.sendRequest(
      {
        url: "https://xray.cloud.getxray.app/api/v2/authenticate",
        method: "POST",
        header: { "Content-Type": "application/json" },
        body: {
          mode: "raw",
          raw: JSON.stringify({
            client_id: xrayClientId,
            client_secret: xrayClientSecret,
          }),
        },
      },
      function (err, response) {
        if (err) {
          ctx.console.log("error: " + err);
        }
        token = response.json();
        pm.variables.set(token_key, token);
      }
    );
    ctx.console.log("Xray token:", token_key);
    return pm.variables.get(token_key);
  },
  export_result: (ctx, result) => {
    const pm = ctx.pm;
    ctx.console.log("Exporting result to Xray");
    const import_xray = Boolean(pm.environment.get("xray_enabled"));
    if (!import_xray) return;

    const regex = /[A-Z]{2,}-\d+/g;
    const matches = pm.info.requestName.match(regex);
    if (!matches) {
      ctx.console.log("skipping Xray result import: no matched ticket.");
      return;
    }

    const test_run_key =
      pm.environment.get("xray_testrun_key") ||
      pm.collectionVariables.get("xray_testrun_key");
    const requestCondition =
      pm.request.method === "GET" || pm.request.method === "DELETE";
    let requestBody, responseBody;

    try {
      requestBody = requestCondition ? {} : JSON.parse(pm.request.body.raw);
      responseBody = pm.response.code === 204 ? {} : pm.response.json();
    } catch (error) {
      ctx.console.log("error: " + error);
      requestBody = {};
      responseBody = {};
    }
    const evidenceData = {
      channelClientId: pm.environment.get("client_id"),
      channelClientSecret: pm.environment.get("client_secret"),
      requestUrl: pm.request.url.toString(),
      requestMehtod: pm.request.method,
      requestParams: pm.request.url.getQueryString(),
      requestHeader: pm.request.headers,
      requestBody: requestBody,
      responseHeader: pm.response.headers,
      responseBody: responseBody,
      responseCode: pm.response.code,
    };
    const cases = pm.variables.get(pm.info.requestName);
    if (cases) {
      evidenceData["tests"] = cases;
      pm.variables.set(pm.info.requestName, []);
    }
    const filename =
      test_run_key +
      "_" +
      matches[0] +
      "_" +
      new Date().toISOString() +
      ".json";
    const evidences = utils.encode(JSON.stringify(evidenceData));
    utils.attach_evidence_to_jira(ctx, matches[0], evidenceData, filename);

    pm.sendRequest(
      {
        url: "https://xray.cloud.getxray.app/api/v2/import/execution",
        method: "POST",
        header: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + utils.loginXray(ctx),
        },
        body: {
          mode: "raw",
          raw: JSON.stringify({
            testExecutionKey: test_run_key,
            tests: [
              {
                testKey: matches[0],
                comment: "This is an automated execution from Postman.",
                status: result,
                evidence: [
                  {
                    data: evidences,
                    filename: filename,
                    contentType: "application/json",
                  },
                ],
              },
            ],
          }),
        },
      },
      function (err, response) {
        if (err) {
          ctx.console.log("error: " + err);
        }
        ctx.console.log(response.json());
      }
    );
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
    let tokenDate = new Date(2022, 1, 1);
    if (tokenTimestamp) {
      tokenDate = Date.parse(tokenTimestamp);
    }

    if (new Date() - tokenDate >= expiresInTime || !accessToken) {
      pm.sendRequest(
        {
          url: authUrl,
          method: "POST",
          header: {
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: {
            mode: "urlencoded",
            urlencoded: [
              { key: "grant_type", value: "client_credentials" },
              { key: "client_id", value: clientId },
              { key: "client_secret", value: clientSecret },
            ],
          },
        },
        function (err, res) {
          if (err) {
            ctx.console.log("error: " + err);
          }
          accessToken = res.json().access_token;
          pm.collectionVariables.set("OAuth_Token", accessToken);
          pm.collectionVariables.set("OAuth_Timestamp", new Date());

          // Set the ExpiresInTime variable to the time given in the response if it exists
          if (res.json().expires_in) {
            expiresInTime = res.json().expires_in * 1000;
          }
          pm.environment.set("ExpiresInTime", expiresInTime);
          pm.request.headers.add("Authorization: Bearer " + accessToken);
        }
      );
    } else {
      pm.request.headers.add("Authorization: Bearer " + accessToken);
    }
  },
  init: (ctx) => {
    utils.loginXray(ctx);
    utils.loginCsg(ctx);
    ctx.console.log("initialized");
  },
};
return utils;
