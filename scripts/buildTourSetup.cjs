#!/usr/bin/env node
/**
 * Generates src/data/tourSetup.json with:
 * - 1 Depot (N00)
 * - 18 Addresses (07:00-10:00)
 * - 50 Mid-Nodes
 * - Junctions at "lock" points (at least degree 3)
 * - 4 blocked edges (blocked=true)
 * - Lengths: km (px / SCALE_PX_PER_KM)
 *
 * Run: npm run build:tour
 */

const fs = require("fs");
const path = require("path");

// ---------------- Parameter ----------------
const WIDTH = 960;
const HEIGHT = 640;
const SCALE_PX_PER_KM = 110;  // 110 px ≈ 1 km
const SEED = 42;
const NUM_ADDRESSES = 18;
const NUM_MIDS = 50;
const NUM_BLOCKED = 4;

const BASELINE = { distanceKm: 27, cost: 291.60, co2Kg: 6.534, ontimePct: 85 };

// ---------------- Utils ----------------
function lcg(seed) {
  let s = seed >>> 0;
  return function () {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}
const rnd = lcg(SEED);

function jitter(v, amp) { return Math.round(v + (rnd()*2 - 1) * amp); }
function distPx(a, b) { const dx=a.x-b.x, dy=a.y-b.y; return Math.sqrt(dx*dx + dy*dy); }
function toKm(px) { return +(px / SCALE_PX_PER_KM).toFixed(3); }

// IDs
let aid=0, jid=0, mid=0, eid=0;
const newEdgeId = () => `E${String(++eid).padStart(2, "0")}`;
const newAddrId = () => `A${String(++aid).padStart(2, "0")}`;
const newJuncId = () => `J${String(++jid).padStart(2, "0")}`;
const newMidId  = () => `M${String(++mid).padStart(2, "0")}`;

// ---------------- Polylines (Street Skeleton) ----------------
// lock:true => explicit shared node (Junction). Otherwise: Mid.
function P(points) { return points.map(p => ({...p, lock: !!p.lock})); }

// East–West
const EW1 = P([{x:70,y:140},{x:240,y:150,lock:true},{x:420,y:155},{x:610,y:150,lock:true},{x:880,y:140}]);
const EW2 = P([{x:40,y:320},{x:240,y:320,lock:true},{x:480,y:320,lock:true},{x:720,y:320,lock:true},{x:920,y:320}]);
const EW3 = P([{x:90,y:510},{x:260,y:500,lock:true},{x:430,y:505},{x:650,y:500,lock:true},{x:890,y:510}]);
// North–South
const NS1 = P([{x:200,y:70},{x:200,y:200,lock:true},{x:200,y:360,lock:true},{x:200,y:560}]);
const NS2 = P([{x:480,y:60},{x:480,y:200,lock:true},{x:480,y:320,lock:true},{x:480,y:480,lock:true},{x:480,y:600}]);
const NS3 = P([{x:760,y:80},{x:760,y:220,lock:true},{x:760,y:360,lock:true},{x:760,y:560}]);
// Diagonalen (meist ohne lock => visuelle Crossings)
const DG1 = P([{x:120,y:560},{x:260,y:420},{x:380,y:320,lock:true},{x:600,y:200},{x:840,y:110}]);
const DG2 = P([{x:130,y:120},{x:310,y:250,lock:true},{x:540,y:360},{x:760,y:460,lock:true},{x:900,y:560}]);

const polylines = [EW1, EW2, EW3, NS1, NS2, NS3, DG1, DG2];

// ---------------- Nodes & Depot ----------------
const nodes = [];
const nodeByKey = new Map(); // for lock: same coordinate -> same Junction node

function addNode(type, x, y, label) {
  let id;
  if (type === "depot") id = "N00";
  else if (type === "address") id = newAddrId();
  else if (type === "junction") id = newJuncId();
  else if (type === "mid") id = newMidId();
  else throw new Error("unknown type");
  const n = { id, type, x: Math.round(x), y: Math.round(y) };
  if (label) n.label = label;
  nodes.push(n);
  return n;
}

function addOrGetJunction(x, y) {
  const k = `${Math.round(x)}|${Math.round(y)}`;
  if (nodeByKey.has(k)) return nodeByKey.get(k);
  const n = addNode("junction", x, y);
  nodeByKey.set(k, n);
  return n;
}

// Depot mittig (liegt auf EW2/NS2 Schnitt)
const DEPOT = addNode("depot", 480, 320, "Depot");

// bake polylines zu Nodes (lock => junction, sonst mid)
function bakePolyline(poly) {
  const arr = [];
  for (const p of poly) {
    if (p.lock) {
      if (Math.abs(p.x-DEPOT.x)<2 && Math.abs(p.y-DEPOT.y)<2) arr.push(DEPOT);
      else arr.push(addOrGetJunction(p.x, p.y));
    } else {
      arr.push(addNode("mid", p.x, p.y));
    }
  }
  return arr;
}
const streetNodes = polylines.map(bakePolyline);

// ---------------- Additional Mid-Nodes on Segments ----------------
function addExtraMids(targetCount) {
  const countMid = () => nodes.filter(n => n.type === "mid").length;
  while (countMid() < targetCount) {
    const li = Math.floor(rnd()*streetNodes.length);
    const line = streetNodes[li];
    if (line.length < 2) continue;
    const si = Math.floor(rnd()*(line.length-1));
    const a = line[si], b = line[si+1];
    const t = 0.25 + rnd()*0.5;
    const x = jitter(a.x + t*(b.x - a.x), 4);
    const y = jitter(a.y + t*(b.y - a.y), 4);
    const m = addNode("mid", x, y);
    line.splice(si+1, 0, m); // insert cleanly in line
  }
}
addExtraMids(NUM_MIDS);

// ---------------- Adressen platzieren (18) ----------------
function shuffled(arr) {
  const res = arr.slice();
  for (let i=res.length-1; i>0; i--){
    const j = Math.floor(rnd()*(i+1));
    [res[i],res[j]] = [res[j],res[i]];
  }
  return res;
}
// Kandidaten: mids & junctions (nicht Depot)
const candidates = shuffled(nodes.filter(n => n.type!=="depot"));
let addrCount = 0;
for (const n of candidates) {
  if (addrCount >= NUM_ADDRESSES) break;
  // Adresse exakt an gleicher Position wie Node n
  const a = addNode("address", n.x, n.y, `Adr ${addrCount+1}`);
  a.timeWindow = { start: "07:00", end: "10:00" };
  addrCount++;
}

// ---------------- Kanten aus Polylinien ----------------
const edges = [];
function addEdge(a, b) {
  const id = newEdgeId();
  edges.push({ id, a: a.id, b: b.id, lengthKm: toKm(distPx(a,b)) });
}
for (const line of streetNodes) {
  for (let i=0; i<line.length-1; i++) addEdge(line[i], line[i+1]);
}

// ---------------- 4 gesperrte Kanten markieren ----------------
function markBlocked(n = NUM_BLOCKED) {
  const ok = edges.filter(e => {
    const A = nodes.find(n => n.id===e.a);
    const B = nodes.find(n => n.id===e.b);
    const lenOk = e.lengthKm >= 0.2;
    const touchesDepot = (A.type==="depot" || B.type==="depot");
    return lenOk && !touchesDepot;
  });
  const mix = shuffled(ok);
  mix.slice(0, n).forEach(e => e.blocked = true);
}
markBlocked(NUM_BLOCKED);

// ---------------- Ausgabe ----------------
const tourSetup = {
  canvas: { width: WIDTH, height: HEIGHT, scalePxPerKm: SCALE_PX_PER_KM },
  nodes,
  edges,
  baseline: BASELINE
};

const outPath = path.join(process.cwd(), "src", "data", "tourSetup.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(tourSetup, null, 2), "utf-8");

console.log(`[OK] geschrieben: ${outPath}`);
console.log(`Nodes: ${nodes.length} (depot=${nodes.filter(n=>n.type==='depot').length}, address=${nodes.filter(n=>n.type==='address').length}, junction=${nodes.filter(n=>n.type==='junction').length}, mid=${nodes.filter(n=>n.type==='mid').length})`);
console.log(`Edges: ${edges.length} (blocked=${edges.filter(e=>e.blocked).length})`);
