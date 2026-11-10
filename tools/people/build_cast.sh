#!/bin/bash
# builds all cast members, 3 in parallel
B=/home/user/tools/blender-5.2.3-linux-x64/blender
cd /home/user/neon
run() { $B --background --factory-startup --python tools/people/build_person.py -- $1 assets/models/person_$1.glb shots/person_$1.png 2>&1 | grep -E "BUILT|EXPORTED|Traceback|rror" ; }
export -f run; export B
printf '%s\n' ${@:-m2 m3 m4 m5 m6 f1 f2 f3 f4 f5 f6} | xargs -P 3 -I{} bash -c 'run {}'
