# Script Name

The script provides various utility functions for automating tasks related to Jira, Malaysian ID validation, random data generation, and encoding.

## Installation

No installation is required as the script can be directly included in your project.

## Usage

1. Import the `utils` object to your Postman (Pre-request Script tab):

```javascript
xray = {};
if (pm.variables.get("script")){
    xray = (new Function(`"use strict"; ${pm.variables.get("script")}`))();
    xray.init(this);
} else {
    pm.sendRequest("https://raw.githubusercontent.com/maxleow/xray/master/v9/util-beta-14.js", (err, res) => {
        if (err) {
            console.error("Error loading external script:", err);
            return;
        }
        const scriptContent = res.text();
        pm.variables.set("script", scriptContent);
        xray = (new Function(`"use strict"; ${scriptContent}`))();
        xray.init(this);
    });
}
```

2. Use the imported object in `test tab`
```javascript
const cases = {
    "Status code is 200": () => {
        pm.response.to.have.status(200);
    },
    "Expecting empty response body for new customer": () => {
        pm.expect(pm.response.json()).to.empty;
    }
};
xray.tests.start(this, cases);
xray.export_result(this, pm.variables.get('result'));

```

# License

This script is licensed under the MIT License.


# Contribution

Contributions are welcome! If you have any suggestions or improvements, feel free to create a pull request.

# Support

For any questions or issues, please open an issue on the GitHub repository.

# Credits

This script was created by Max Leow.
