// Aircraft and boat physics with the same surface as Car, so they plug into Vehicle / World / Player unchanged.
// Controls: throttle (W) / brake (S) / steer (A, D) / hand (SPACE) = climb / nitro (SHIFT) = descend.
export const SEA = { x0: 1000, x1: 3200, z0: -1600, z1: 1600 };
export const SEA_LEVEL = 0.5;
export const inSea = (x, z) => x > SEA.x0 && x < SEA.x1 && z > SEA.z0 && z < SEA.z1;
export const wave = (x, z, t) => Math.sin(x * 0.045 + t * 1.3) * 0.22 + Math.sin(z * 0.06 - t * 1.7) * 0.16 + Math.sin((x + z) * 0.11 + t * 2.3) * 0.07;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

class Craft {
  constructor(spec, x, z, heading) {
    this.spec = spec; this.x = x; this.z = z; this.h = heading; this.vx = 0; this.vz = 0; this.vy = 0; this.yaw = 0; this.steer = 0; this.y = 0; this.speed = 0; this.fwd = 0; this.lat = 0; this.rpm = 0.2; this.gear = 1;
    this.nitro = 1; this.nitroOn = false; this.slip = 0; this.drift = 0; this.braking = false; this.reversing = false; this.wheelSpin = 0; this.health = 100; this.hitCD = 0; this.pitch = 0; this.roll = 0;
    this.mass = spec.mass; this.radius = spec.body.W / 2; this.len = spec.body.L; this.onSidewalk = false; this.smoke = 0; this.t = Math.random() * 10; this.propSpeed = 0; this.rotorSpeed = 0; this.tailSpeed = 0; this.groundHit = 0;
    this.input = { throttle: 0, brake: 0, steer: 0, hand: 0, nitro: 0 };
  }
  get kmh() { return Math.abs(this.speed) * 3.6; }
  bounce(nx, nz, restitution = 0.35) { const vn = this.vx * nx + this.vz * nz; if (vn >= 0) return 0; this.vx -= (1 + restitution) * vn * nx; this.vz -= (1 + restitution) * vn * nz; this.speed *= 0.6; return -vn; }
  sync() { this.vx = Math.sin(this.h) * this.speed; this.vz = Math.cos(this.h) * this.speed; this.fwd = this.speed; }
}

// ------------------------------------------------------------------ light plane
export class Plane extends Craft {
  constructor(spec, x, z, h) { super(spec, x, z, h); this.air = true; this.power = 0; this.airborne = false; }
  step(dt) {
    const s = this.spec, I = this.input, vmax = s.top / 3.6, stall = vmax * 0.36; this.t += dt;
    const occupied = this.occupied; if (!occupied) { this.power = Math.max(0, this.power - dt * 0.5); } else { this.power = clamp(this.power + (I.throttle - I.brake * 0.9) * dt * 0.38, 0, 1); }
    this.nitroOn = false; this.nitro = 1;   // SHIFT is 'dive' on aircraft, not a boost
    const target = this.power * vmax * (1 - Math.max(0, 35 - this.health) / 100);
    const ground = this.y <= 0.02;
    this.speed += (target - this.speed) * Math.min(1, dt * 0.55);
    if (ground) { this.speed -= (this.speed * 0.01 + 0.4) * dt * (this.speed > 0 ? 1 : 0); if (I.brake > 0.01 && this.power < 0.05) this.speed = Math.max(0, this.speed - 22 * I.brake * dt); this.speed = Math.max(0, this.speed); }
    const lf = clamp((this.speed - stall * 0.85) / (stall * 0.55), 0, 1), want = (I.hand ? 1 : 0) - (I.nitro && !this.nitroOn ? 1 : 0);
    const up = I.hand ? 1 : 0, down = I.nitro ? 1 : 0, pitchIn = up - down;
    let vyt = (up * 15 - down * 9) * lf; if (!ground && lf < 1) vyt -= (1 - lf) * 16; if (!ground && (lf >= 0.15 || this.y < 3.5)) vyt = Math.max(vyt, -(this.y * 1.3 + 1.5));   // ground-effect flare: a normal approach touches down softly
    if (ground) { if (up && lf > 0.55) { this.vy = 2.5; this.y = 0.06; } else this.vy = 0; } else this.vy += (vyt - this.vy) * Math.min(1, dt * 2.4);
    if (!ground || this.vy > 0) { this.y += this.vy * dt; this.airborne = true; }
    if (this.y <= 0 && this.airborne) { const impact = -this.vy; if (impact > 4.5) this.groundHit = impact > 8 ? impact * 3.5 : impact * 0.8; this.y = 0; this.vy = 0; this.airborne = false; }
    if (this.y > 450) { this.y = 450; this.vy = Math.min(0, this.vy); }
    // heading
    const turnRate = ground ? I.steer * clamp(this.speed / 7, 0, 1) * 0.55 : I.steer * 0.62 * Math.max(0.4, lf);
    this.h += turnRate * dt; this.steer += (I.steer * 0.5 - this.steer) * Math.min(1, dt * 6);
    const rollT = ground ? 0 : -I.steer * 0.55 * lf, pitchT = ground ? 0 : -clamp(this.vy / Math.max(this.speed, 14), -0.45, 0.45);
    this.roll += (rollT - this.roll) * Math.min(1, dt * 3); this.pitch += (pitchT - this.pitch) * Math.min(1, dt * 3);
    this.sync(); this.x += this.vx * dt; this.z += this.vz * dt; this.wheelSpin += this.speed / 0.28 * dt * (ground ? 1 : 0.2);
    this.rpm = 0.25 + this.power * 0.75; this.propSpeed = occupied || this.power > 0.02 ? 12 + this.power * 70 : 0; this.gear = 1; this.braking = ground && I.brake > 0.01; this.onSidewalk = false;
  }
}

// ------------------------------------------------------------------ helicopter
export class Heli extends Craft {
  constructor(spec, x, z, h) { super(spec, x, z, h); this.air = true; this.lift = 0; }
  step(dt) {
    const s = this.spec, I = this.input, vmax = s.top / 3.6, occupied = this.occupied; this.t += dt;
    this.lift += ((occupied ? 1 : 0) - this.lift) * Math.min(1, dt * 0.6);   // rotor spool
    const ground = this.y <= 0.03, ctl = clamp((this.lift - 0.4) / 0.4, 0, 1);
    const target = ctl * (I.throttle - I.brake * 0.55) * vmax * (ground ? 0.1 : this.y < 4 ? 0.5 : 1) * (1 - Math.max(0, 35 - this.health) / 100);
    this.speed += (target - this.speed) * Math.min(1, dt * 0.9); if (ground) this.speed *= Math.max(0, 1 - dt * 1.5 * (1 - I.throttle));
    let vyt = ctl * ((I.hand ? 1 : 0) * 9 - (I.nitro ? 1 : 0) * 9); if (this.y < 6 && ctl > 0.5) vyt = Math.max(vyt, -(this.y * 1.2 + 0.8));
    this.vy += (vyt - this.vy) * Math.min(1, dt * 1.6); if (!ctl && !ground) this.vy -= 12 * dt;
    this.y += this.vy * dt; if (this.y <= 0) { const impact = -this.vy; if (impact > 4) this.groundHit = impact * 3; this.y = 0; this.vy = Math.max(0, this.vy); }
    if (this.y > 420) { this.y = 420; this.vy = Math.min(0, this.vy); }
    this.h += I.steer * 1.25 * ctl * dt * (ground ? 0.4 : 1); this.steer += (I.steer * 0.5 - this.steer) * Math.min(1, dt * 6);
    this.pitch += (clamp(this.speed / vmax, -0.4, 1) * 0.28 - this.pitch) * Math.min(1, dt * 2.5); this.roll += (-I.steer * 0.3 * (ground ? 0 : 1) - this.roll) * Math.min(1, dt * 3);
    this.sync(); this.x += this.vx * dt; this.z += this.vz * dt; this.rpm = 0.3 + this.lift * 0.6; this.rotorSpeed = this.lift * 38; this.tailSpeed = this.lift * 60; this.gear = 1; this.onSidewalk = false;
  }
}

// ------------------------------------------------------------------ speedboat
export class Boat extends Craft {
  constructor(spec, x, z, h) { super(spec, x, z, h); this.boat = true; this.fwdS = 0; }
  step(dt) {
    const s = this.spec, I = this.input, top = s.top / 3.6; this.t += dt; const w = inSea(this.x, this.z);
    const boost = I.nitro && this.nitro > 0.02 ? 1.5 : 1; this.nitroOn = boost > 1; if (this.nitroOn) this.nitro = Math.max(0, this.nitro - dt * 0.2); else this.nitro = Math.min(1, this.nitro + dt * 0.04);
    const fx = Math.sin(this.h), fz = Math.cos(this.h), rx = Math.cos(this.h), rz = -Math.sin(this.h);
    let fwd = this.vx * fx + this.vz * fz, lat = this.vx * rx + this.vz * rz;
    if (w) {
      const vmax = top * boost; const f = clamp(1 - Math.pow(Math.max(0, fwd) / vmax, 2), 0, 1);
      if (I.throttle > 0.01) fwd += I.throttle * s.acc * (0.4 + f) * boost * dt; if (I.brake > 0.01) fwd -= (fwd > 1 ? 14 : 5) * I.brake * dt;
      fwd -= fwd * 0.12 * dt; lat -= lat * Math.min(1, dt * 1.8);
    } else { fwd *= Math.max(0, 1 - dt * 3.5); lat *= Math.max(0, 1 - dt * 3.5); }   // beached
    const steerRate = I.steer * clamp(Math.abs(fwd) / 4, 0, 1) * 0.95 * (fwd < 0 ? -1 : 1); this.h += steerRate * dt; this.steer += (I.steer * 0.5 - this.steer) * Math.min(1, dt * 6);
    const nfx = Math.sin(this.h), nfz = Math.cos(this.h), nrx = Math.cos(this.h), nrz = -Math.sin(this.h);
    this.vx = nfx * fwd + nrx * lat; this.vz = nfz * fwd + nrz * lat; this.x += this.vx * dt; this.z += this.vz * dt;
    if (this.x > SEA.x1) { this.x = SEA.x1; this.vx = -Math.abs(this.vx) * 0.3; } if (this.z < SEA.z0) { this.z = SEA.z0; this.vz = Math.abs(this.vz) * 0.3; } if (this.z > SEA.z1) { this.z = SEA.z1; this.vz = -Math.abs(this.vz) * 0.3; }
    this.fwd = fwd; this.lat = lat; this.speed = fwd;
    const bob = w ? wave(this.x, this.z, this.t) : 0; this.y = w ? bob * 0.7 + SEA_LEVEL - 0.15 : -0.05; this.pitch += ((w ? -clamp(fwd / top, 0, 1) * 0.08 + Math.cos(this.t * 1.3 + this.x * 0.05) * 0.015 : 0) - this.pitch) * Math.min(1, dt * 3);
    this.roll += ((w ? -I.steer * clamp(fwd / 12, 0, 1) * 0.35 + Math.sin(this.t * 1.7) * 0.02 : 0) - this.roll) * Math.min(1, dt * 3);
    this.rpm = 0.25 + clamp(Math.abs(fwd) / top, 0, 1) * 0.75; this.gear = 1; this.propSpeed = 20 + Math.abs(fwd) * 4; this.onSidewalk = false; this.braking = I.brake > 0.01 && fwd > 1; this.reversing = fwd < -0.5;
  }
}
