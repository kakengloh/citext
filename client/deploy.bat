@echo off

call npm run build
surge "%cd%\dist" --domain citext.surge.sh