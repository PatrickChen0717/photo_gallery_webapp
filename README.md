# Photo Share Gallery

Small local web app for browsing the image folders in `G:\写真`.

## Features

- Scans the folders next to the app and shows one card per top-level folder
- Serves images directly from disk without copying them into the app
- Shows archive counts so you can spot folders that still contain `.zip`, `.7z`, or `.rar`
- Opens a simple full-size image viewer in the browser

## Run

```powershell
cd G:\写真\gallery-webapp
npm start
```

Then open `http://localhost:3080`.

## Notes

- The app rescans the library roughly once per minute.
- It excludes the `gallery-webapp` folder itself from indexing.
- The first scan can take a little while because the library is large.
