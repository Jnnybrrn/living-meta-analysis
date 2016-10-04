# living-meta-analysis
A tool for supporting living and collaborative meta-analysis.

## installation and running

 1 clone the repo
 1 `npm install`
 1 fill in google-datastore-specific settings in `server/config.js`
   * the above needs an authentication key pointed at by `config.gcloudProject.keyFilename` – this is generated for you by the Google developer console
 1 `npm start`
