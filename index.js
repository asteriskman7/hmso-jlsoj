'use strict';

/*
  first canvas is a grid of blocks
  to complete each one you must complete the related julia set
  each pixel in the julia set takes a time proportional to the bail out iterations
  when you find pixels in the julia set you get points you can use to increase
    your speed
  you apply effort to mandel squares by allocating your julia set points
  you start out with 1 julia set point to allocate
  you must also get some points for completing a julia set because otherwise
    there are a lot of julia sets that probably will have 0 pixels in the set
  need to pre-calculate all the data because floating point calculations might
    not be the same on all devices
*/

class App {
  constructor() {
    console.log('init');

    this.cmandel = document.querySelector('#cmandel');
    this.cjulia = document.querySelector('#cjulia');

    this.mctx = this.cmandel.getContext('2d');
    this.jctx = this.cjulia.getContext('2d');

    this.drawMandel(this.mctx);
    this.drawJulia(this.jctx);
  }

  getMandel(x, y, maxIter) {
    let zr = 0;
    let zi = 0;

    let iter = 0;

    let d = 0;

    while (d < 2) {
      //z = z^2 + c
      //zr+zi = zr * zr - zi * zi + 2*zr*zi + x + y
      [zr, zi] = [
        zr * zr - zi * zi + x,
        2 * zr * zi + y
      ];

      d = Math.hypot(zr, zi);

      iter++;

      if (iter >= maxIter) {
        return 0;
      }
    }

    return iter;
  }

  getJulia(x, y, cr, ci, maxIter) {
    let zr = x;
    let zi = y;

    let iter = 0;
    let d = 0;
    while (d < 2) {
      [zr, zi] = [
        zr * zr - zi * zi + cr,
        2 * zr * zi + ci
      ];

      d = Math.hypot(zr, zi);

      iter++;

      if (iter >= maxIter) {
        return 0;
      }
    }

    return iter;
  }

  lerp(a, b, t) {
    return (1 - t) * a + t * b;
  }

  drawMandel(ctx) {
    const size = 4;
    for (let cx = 0; cx < ctx.canvas.width; cx += size) {
      for (let cy = 0; cy < ctx.canvas.height; cy += size) {
        const x = this.lerp(-2, 2, cx / ctx.canvas.width);
        const y = this.lerp(-2, 2, cy / ctx.canvas.width);
        const val = this.getMandel(x, y, 100);
        ctx.fillStyle = `hsl(${val * 360 / 100}, 50%, ${val === 0 ? 0 : 50}%)`;
        ctx.fillRect(cx, cy, size, size);
      }
    }
  }

  drawJulia(ctx) {
    const size = 2;
    for (let cx = 0; cx < ctx.canvas.width; cx += size) {
      for (let cy = 0; cy < ctx.canvas.height; cy += size) {
        const x = this.lerp(-2, 2, cx / ctx.canvas.width);
        const y = this.lerp(-2, 2, cy / ctx.canvas.width);
        const val = this.getJulia(x, y, -1, 0, 100);
        ctx.fillStyle = `hsl(${val * 360 / 100}, 50%, ${val === 0 ? 0 : 50}%)`;
        ctx.fillRect(cx, cy, size, size);
      }
    }
  }
}

const app = new App();
