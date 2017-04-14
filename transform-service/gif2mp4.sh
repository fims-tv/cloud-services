#!/bin/bash

echo "gif2mp4 script running"
echo $1

cd /tmp

CODE=`basename $1 .gif`

echo $CODE

echo "ls -l of files in tmp"
ls -l /tmp

/tmp/ffmpeg -y -i $1 -c:v libx264 -pix_fmt yuv420p $CODE.mp4

echo "ls -l"
ls -l



echo "ls -l"
ls -l


for i in {1..5}; do printf "file '%s'\n" $CODE.mp4 >> list.txt; done
/tmp/ffmpeg -y -f concat -i list.txt -c copy $CODE-final.mp4

rm $1
rm $CODE.mp4
rm list.txt