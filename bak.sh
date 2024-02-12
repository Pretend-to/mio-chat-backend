#!/bin/bash

current_date=$(date +"%Y-%m-%d")
zip_filename="ai-paint-${current_date}.zip"

zip "./lib/resources/${zip_filename}" ./lib/resources/pics/*

# 删除 ./lib/resources/pics/* 中的文件
rm -rf ./lib/resources/pics/*