import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { spawnPerson } from './people.js';
const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(900, 600); document.body.appendChild(r.domElement); r.toneMapping = THREE.ACESFilmicToneMapping;
const sc = new THREE.Scene(); sc.background = new THREE.Color(0x1a1d24); sc.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
const fl = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: 0x30343c })); fl.rotation.x = -Math.PI / 2; sc.add(fl);
sc.add(new THREE.DirectionalLight(0xffffff, 2).translateX(5).translateY(8).translateZ(6));
const cam = new THREE.PerspectiveCamera(35, 1.5, 0.1, 100);
window.run = async (car, pid, seat, open, view) => {
  const g = await new GLTFLoader().loadAsync(`../assets/models/${car}.glb`); const car3 = g.scene; sc.add(car3);
  const dl = car3.getObjectByName('door_L'); if (dl) dl.rotation.y = -open;
  const p = await spawnPerson(pid); car3.add(p.root); p.root.position.set(seat[0], seat[1], seat[2]); p.play('Drive'); p.update(0.5);
  cam.position.set(...view); cam.lookAt(0, 0.9, 0); r.render(sc, cam); return p.height;
};
window.ready = true;
