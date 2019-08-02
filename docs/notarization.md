# Notarization Configuration

Notarization gives users more confidence that the plugin you distribute has been checked by Apple for malicious components. Notarization is not App Review. The Apple notary service is an automated system that scans your software for malicious content, checks for code-signing issues, and returns the results to you quickly.

Notarization is becoming mandatory on macOS 10.15 if your plugin contains native frameworks and might become mandatory for every plugin in an upcoming version of macOS (Apple is tightening up the security).

Skpm makes it easy to notarize your plugin when you publish it.

## How to

If you do not have a native framework, skip to 2.

1. You first need to sign your framework. In your Xcode project, go to the "Signing and Capabilities" tab. You need to use a "Developer ID Application" certificate.
2. Create a `.skpmrc` file next to your `package.json` file
3. Add the following content in the `.skpmrc` file:

   ```yaml
   notarization:
     authority: 'Developer ID Application: TEAM'
     username: 'AC_USERNAME'
     password: '@keychain:AC_PASSWORD'
   ```

Replace `TEAM` with the name of your team on App Store Connect.

Replace the `AC_USERNAME` with your App Store Connect username (usually an email address). Because App Store Connect now requires two-factor authentication (2FA) on all accounts, you must create an app-specific password, as described in [Using app-specific passwords](https://support.apple.com/en-us/HT204397).

To avoid including your password as cleartext in the file, you can provide a reference to a keychain item. This assumes the keychain holds a keychain item named `AC_PASSWORD` with an account value matching the username `AC_USERNAME`. Note that skpm can’t access your iCloud keychain for security reasons, so the item must be in your login keychain. You can add a new keychain item using the Keychain Access app, or from the command line using the security utility:

```bash
security add-generic-password -a "AC_USERNAME" -w <secret_password> -s "AC_PASSWORD"
```

## Custom command

Alternatively, if you have some more complex needs for your plugin, you can replace the default skpm process by a custom bash command.

In the `.skpmrc` file, add the following content:

```yaml
notarization:
  command: './custom-script.sh'
```

Skpm will execute `./custom-script.sh ./path/to/plugin.zip` and expect the same zip to be notarized at the end.
