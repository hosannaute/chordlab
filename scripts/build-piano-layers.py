"""Build the optional two-velocity Salamander pack from pinned CC-BY-3.0 originals.
Usage: python scripts/build-piano-layers.py PATH_TO_FFMPEG
"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from urllib.request import urlopen
from urllib.parse import quote
import hashlib, json, re, subprocess, sys
SHA='3382bf9496bba2486f5ab0de55a264d1dfc38404'
BASE=f'https://raw.githubusercontent.com/sfzinstruments/SalamanderGrandPiano/{SHA}/'
ROOT=Path(__file__).resolve().parents[1]
CACHE=ROOT.parent/'piano-layer-sources'
OUT=ROOT/'public/audio/grand-piano/layers'
CACHE.mkdir(exist_ok=True); OUT.mkdir(exist_ok=True)
def fetch(path):
    target=CACHE/Path(path).name
    if not target.exists():
        with urlopen(BASE+quote(path,safe='/'),timeout=60) as response: target.write_bytes(response.read())
    return target
vels={layer:fetch(f'Data/vel_{layer:02}.txt').read_text() for layer in [4,12]}
entries=[]
def build(item):
    index,layer,label=item
    pitch=36+index*3
    root=['C','D#','F#','A'][index%4]+str(pitch//12-1)
    source=f'{root}v{layer}.flac'
    data=fetch('Samples/'+source)
    region=index+6
    offset=int(re.search(rf'\$OFF{region:02}\s+(\d+)',vels[layer]).group(1))
    name=root.replace('#','s')+'-'+label+'.mp3'
    dest=OUT/name
    subprocess.run([sys.argv[1],'-hide_banner','-loglevel','error','-y','-ss',str(offset/48000),'-i',str(data),'-t','12','-ac','1','-ar','22050','-codec:a','libmp3lame','-b:a','64k','-af','afade=t=out:st=11.5:d=0.5',str(dest)],check=True)
    return dict(pitch=pitch,layer=label,velocityLayer=layer,source=source,offsetFrames=offset,sourceSha256=hashlib.sha256(data.read_bytes()).hexdigest(),file=name,bytes=dest.stat().st_size,sha256=hashlib.sha256(dest.read_bytes()).hexdigest())
with ThreadPoolExecutor(max_workers=3) as pool:
    for entry in pool.map(build,[(i,layer,label) for i in range(21) for layer,label in [(4,'soft'),(12,'hard')]]):
        entries.append(entry); print(entry['file'],entry['bytes'],flush=True)
manifest=dict(author='Alexander Holm',license='CC-BY-3.0',repository='sfzinstruments/SalamanderGrandPiano',commit=SHA,conversion='Apply SFZ onset offset, first 12 seconds, mono 22050 Hz MP3 64 kbps, final 0.5 second fade',samples=entries)
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
