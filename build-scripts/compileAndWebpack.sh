#!/bin/sh

pnpm run compile
cd ../mythic-analyzer-vsc/mythic-language-server
webpack
