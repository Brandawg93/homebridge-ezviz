<p align="center">
  <a href="https://github.com/homebridge/verified/blob/master/verified-plugins.json"><img alt="Homebridge Verified" src="https://raw.githubusercontent.com/Brandawg93/homebridge-ezviz/master/branding/Homebridge_x_EZVIZ.svg?sanitize=true" width="500px"></a>
</p>

# homebridge-ezviz

View your EZVIZ cameras in HomeKit using [Homebridge](https://github.com/homebridge/homebridge) with this plugin.

[![NPM](https://nodei.co/npm/homebridge-ezviz.png?compact=true)](https://nodei.co/npm/homebridge-ezviz/)

[![PayPal](https://img.shields.io/badge/paypal-donate-blue?logo=paypal)](https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=CEYYGVB7ZZ764&item_name=homebridge-ezviz&currency_code=USD&source=url)
[![BuyMeACoffee](https://img.shields.io/badge/coffee-donate-orange?logo=buy-me-a-coffee&logoColor=yellow)](https://www.buymeacoffee.com/L1FgZTD)

[![verified-by-homebridge](https://img.shields.io/badge/homebridge-verified-blueviolet?color=%2357277C&logo=data:image/svg%2bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5OTIuMDkiIGhlaWdodD0iMTAwMCIgdmlld0JveD0iMCAwIDk5Mi4wOSAxMDAwIj48ZGVmcz48c3R5bGU+LmF7ZmlsbDojZmZmO308L3N0eWxlPjwvZGVmcz48cGF0aCBjbGFzcz0iYSIgZD0iTTk1MC4xOSw1MDguMDZhNDEuOTEsNDEuOTEsMCwwLDEtNDItNDEuOWMwLS40OC4zLS45MS4zLTEuNDJMODI1Ljg2LDM4Mi4xYTc0LjI2LDc0LjI2LDAsMCwxLTIxLjUxLTUyVjEzOC4yMmExNi4xMywxNi4xMywwLDAsMC0xNi4wOS0xNkg3MzYuNGExNi4xLDE2LjEsMCwwLDAtMTYsMTZWMjc0Ljg4bC0yMjAuMDktMjEzYTE2LjA4LDE2LjA4LDAsMCwwLTIyLjY0LjE5TDYyLjM0LDQ3Ny4zNGExNiwxNiwwLDAsMCwwLDIyLjY1bDM5LjM5LDM5LjQ5YTE2LjE4LDE2LjE4LDAsMCwwLDIyLjY0LDBMNDQzLjUyLDIyNS4wOWE3My43Miw3My43MiwwLDAsMSwxMDMuNjIuNDVMODYwLDUzOC4zOGE3My42MSw3My42MSwwLDAsMSwwLDEwNGwtMzguNDYsMzguNDdhNzMuODcsNzMuODcsMCwwLDEtMTAzLjIyLjc1TDQ5OC43OSw0NjguMjhhMTYuMDUsMTYuMDUsMCwwLDAtMjIuNjUuMjJMMjY1LjMsNjgwLjI5YTE2LjEzLDE2LjEzLDAsMCwwLDAsMjIuNjZsMzguOTIsMzlhMTYuMDYsMTYuMDYsMCwwLDAsMjIuNjUsMGwxMTQtMTEyLjM5YTczLjc1LDczLjc1LDAsMCwxLDEwMy4yMiwwbDExMywxMTEsLjQyLjQyYTczLjU0LDczLjU0LDAsMCwxLDAsMTA0TDU0NS4wOCw5NTcuMzV2LjcxYTQxLjk1LDQxLjk1LDAsMSwxLTQyLTQxLjk0Yy41MywwLC45NS4zLDEuNDQuM0w2MTYuNDMsODA0LjIzYTE2LjA5LDE2LjA5LDAsMCwwLDQuNzEtMTEuMzMsMTUuODUsMTUuODUsMCwwLDAtNC43OS0xMS4zMmwtMTEzLTExMWExNi4xMywxNi4xMywwLDAsMC0yMi42NiwwTDM2Ny4xNiw3ODIuNzlhNzMuNjYsNzMuNjYsMCwwLDEtMTAzLjY3LS4yN2wtMzktMzlhNzMuNjYsNzMuNjYsMCwwLDEsMC0xMDMuODZMNDM1LjE3LDQyNy44OGE3My43OSw3My43OSwwLDAsMSwxMDMuMzctLjlMNzU4LjEsNjM5Ljc1YTE2LjEzLDE2LjEzLDAsMCwwLDIyLjY2LDBsMzguNDMtMzguNDNhMTYuMTMsMTYuMTMsMCwwLDAsMC0yMi42Nkw1MDYuNSwyNjUuOTNhMTYuMTEsMTYuMTEsMCwwLDAtMjIuNjYsMEwxNjQuNjksNTgwLjQ0QTczLjY5LDczLjY5LDAsMCwxLDYxLjEsNTgwTDIxLjU3LDU0MC42OWwtLjExLS4xMmE3My40Niw3My40NiwwLDAsMSwuMTEtMTAzLjg4TDQzNi44NSwyMS40MUE3My44OSw3My44OSwwLDAsMSw1NDAsMjAuNTZMNjYyLjYzLDEzOS4zMnYtMS4xYTczLjYxLDczLjYxLDAsMCwxLDczLjU0LTczLjVINzg4YTczLjYxLDczLjYxLDAsMCwxLDczLjUsNzMuNVYzMjkuODFhMTYsMTYsMCwwLDAsNC43MSwxMS4zMmw4My4wNyw4My4wNWguNzlhNDEuOTQsNDEuOTQsMCwwLDEsLjA4LDgzLjg4WiIvPjwvc3ZnPg==)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)

![build](https://github.com/Brandawg93/homebridge-ezviz/workflows/build/badge.svg)
[![Discord](https://camo.githubusercontent.com/7494d4da7060081501319a848bbba143cbf6101a/68747470733a2f2f696d672e736869656c64732e696f2f646973636f72642f3433323636333333303238313232363237303f636f6c6f723d373238454435266c6f676f3d646973636f7264266c6162656c3d646973636f7264)](https://discord.gg/pc2pqmh)
[![Downloads](https://img.shields.io/npm/dt/homebridge-ezviz?logo=npm)](https://nodei.co/npm/homebridge-ezviz/)

[![npm (tag)](https://img.shields.io/npm/v/homebridge-ezviz/latest?logo=npm)](https://www.npmjs.com/package/homebridge-ezviz/v/latest)
[![npm (tag)](https://img.shields.io/npm/v/homebridge-ezviz/test?logo=npm)](https://www.npmjs.com/package/homebridge-ezviz/v/test)
[![GitHub commits since latest release (by date)](https://img.shields.io/github/commits-since/brandawg93/homebridge-ezviz/latest?logo=github)](https://github.com/Brandawg93/homebridge-ezviz/releases/latest)

## Installation
1. Install this plugin using: `npm install -g --unsafe-perm homebridge-ezviz`
2. Add your account credentials to `config.json`
3. Run [Homebridge](https://github.com/homebridge/homebridge)

**Note:** 2 Factor Authentication is not supported at this time.

### Setting up the Config.json
#### region
The `"region"` is based on your location. In order to set the `"region"`, either use the Settings UI or view the list of available region in the `config.schema.json`.

#### cameras
Each camera feed is protected by a verification code. The camera's serial number and verification code can be found on the bottom of the device. Add each camera to the `"cameras"` array to be able view their feeds.

```
{
    "region": 314,
    "email": "YOUR_EMAIL",
    "password": "YOUR_PASSWORD",
    "cameras": [
        {
            "serial": "SERIAL",
            "username": "admin",
            "code": "VERIFICATION_CODE"
        }
    ],
    "platform": "EZVIZ"
},
```

#### options
Extra options can be enabled/disabled depending on which switches and sensors you would like to see in the Home app. Here is the current list of available options:

| Name              | Description                                                         | Type             |
|-------------------|---------------------------------------------------------------------|------------------|
| sleepSwitch       | Enable/disable the ability to turn the camera on or off             | boolean          |
| audioSwitch       | Enable/disable the ability to turn the camera audio on or off       | boolean          |
| pathToFfmpeg      | Specify the path to a custom FFmpeg binary                          | string           |

## Join the Discord
Unfortunately, there is no way for me to test every subscription, camera type, and feature. If you would like to help me test new features and enhancements, or if you have general questions or need support, join the official [Homebridge Discord Server](https://discord.gg/pc2pqmh).

## Donate to Support homebridge-ezviz
This plugin was made with you in mind. If you would like to show your appreciation for its continued development, please consider making [a small donation](https://www.buymeacoffee.com/L1FgZTD).

<sub><sup>**Disclaimer:** This plugin and its contributers are not affiliated with Hangzhou Ezviz Network Co., Ltd. in any way.</sub></sup>
