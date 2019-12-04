#!/bin/bash

rm ./node_modules/node-libcurl/lib/binding/node_libcurl.node || "node_libcurl.node didnt pre-exist"
npm rebuild node-libcurl --force