#!/bin/bash

rm ./node_modules/@capecodes/node-libcurl/lib/binding/node_libcurl.node || "node_libcurl.node didnt pre-exist"
npm rebuild @capecodes/node-libcurl --force