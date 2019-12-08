```bash
asar extract ./release/mac/sURLy.app/Contents/Resources/app.asar ./release/mac/sURLy.app/Contents/Resources/tmp
mv ./release/mac/sURLy.app/Contents/Resources/tmp/node_modules/node-libcurl ./release/mac/sURLy.app/Contents/Resources/tmp
/bin/rm -rf ./release/mac/sURLy.app/Contents/Resources/tmp/node_modules/*
mv ./release/mac/sURLy.app/Contents/Resources/tmp/node-libcurl ./release/mac/sURLy.app/Contents/Resources/tmp/node_modules
asar pack ./release/mac/sURLy.app/Contents/Resources/tmp ./release/mac/sURLy.app/Contents/Resources/app.asar
/bin/rm -rf /release/mac/sURLy.app/Contents/Resources/tmp
./release/mac/sURLy.app/Contents/MacOS/sURLy

```