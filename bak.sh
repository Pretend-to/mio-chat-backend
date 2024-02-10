#!/bin/bash

current_date=$(date +"%Y-%m-%d")
zip_filename="ai-paint-${current_date}.zip"

zip "$zip_filename" ./lib/resources/pics/*
