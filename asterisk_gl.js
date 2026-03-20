"use strict";

/*
  WebGLFramework

  How to use:
  Remember, colors are in [0,1] and should have alpha pre-multiplied. So if you
  want a 50% opaque pure red, instead of {r: 1, g: 0, b: 0, a: 0.5}, you should use
  {r: 0.5, g: 0, b: 0, a: 0.5}.

  Create an instance of WebGLFramework, passing the width, height, and bgColor like:
  const webgl = new WebGLFramework({
    canvasWidth: 512, 
    canvasHeight: 512, 
    canvasBGColor: {r: 1, g: 1, b: 1, a: 1}
  });

  OR to have the framework draw directly to your own canvas:
  const webgl = new WebGLFramework({
    canvas: myCanvas,
    canvasBGColor: {r: 1, g: 1, b: 1, a: 1}
  });

  Initialize arrays with the max number of points in your triangles like:
  webgl.initArrays(maxTriangleCount);

  if you're going to use the add* calls:
    Reset triangle indexes if using the add* calls:
    webgl.resetTriangleIndexes();

    Add shapes:
    webgl.addTriangle(t.x, t.y, t.x + t.s, t.y, t.x, t.y + t.s, t.r, t.g, t.b, 1);

    Render the frame:
    webgl.draw();

  if you're going to set the arrays manually:
    //6 values for 1 triangle
    webgl.positionArray[0] = x0;
    webgl.positionArray[1] = y0;
    webgl.positionArray[2] = x1;
    webgl.positionArray[3] = y1;
    webgl.positionArray[4] = x2;
    webgl.positionArray[5] = y2;
    ...

    //12 values for 1 triangle
    webgl.colorArray[0] = r;
    webgl.colorArray[1] = g;
    webgl.colorArray[2] = b;
    webgl.colorArray[3] = a;
    webgl.colorArray[4] = r;
    webgl.colorArray[5] = g;
    webgl.colorArray[6] = b;
    webgl.colorArray[7] = a;
    webgl.colorArray[8] = r;
    webgl.colorArray[9] = g;
    webgl.colorArray[10] = b;
    webgl.colorArray[11] = a;

    Update the gl buffers:
    webgl.setPositions(webgl.positionArray);
    webgl.setColors(webgl.colorArray);

    Render the frame:
    //triangleCount is mandatory if you're managing the arrays yourself
    webgl.draw(triangleCount);

  Copy to your own canvas if you didn't pass it in when creating the instance:
  ctx.drawImage(webgl.canvas, 0, 0);
*/


class WebGLFramework {

  //width & height numbers in pixels
  //canvasBGColor an object {r, g, b, a} with all properties in range [0,1]
  constructor({canvas, canvasWidth, canvasHeight, canvasBGColor}) {
    if (canvas !== undefined) {
      this.canvas = canvas;
    } else {
      this.canvas = document.createElement('canvas');
      this.canvas.width = canvasWidth;
      this.canvas.height = canvasHeight;
    }
    this.canvasBGColor = canvasBGColor;
    this.webglActive = false;

    this.canvas.onwebglcontextlost = (evt) => this.onwebglcontextlost(evt);
    this.canvas.onwebglcontextrestored = (evt) => this.onwebglcontextrestored(evt);

    this.initializeWebGL();
  }

  initializeWebGL() {
    const gl = this.canvas.getContext('webgl2', {alpha: true});
    this.gl = gl;

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const vertextShaderSource = `#version 300 es
// an attribute is an input (in) to a vertex shader.
// It will receive data from a buffer
in vec2 a_position;
in vec4 a_color;

out vec4 v_color;

uniform vec2 u_resolution;
 
void main() {
  //scale so that coordinate space goes from [0,0] to (canvas.width, canvas.height)
  vec2 zeroToOne = a_position / u_resolution;

  vec2 zeroToTwo = zeroToOne * 2.0;

  vec2 clipSpace = zeroToTwo - 1.0;

  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);

  v_color = a_color;
 
}    
    `;

    const fragmentShaderSource = `#version 300 es
// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;

in vec4 v_color;

// we need to declare an output for the fragment shader
out vec4 outColor;
 
void main() {
  outColor = v_color;
}    
    `;

    const vertexShader = this.createShader(gl, gl.VERTEX_SHADER, vertextShaderSource);
    const fragmentShader = this.createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program = this.createProgram(gl, vertexShader, fragmentShader);

    const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
    const colorAttributeLocation = gl.getAttribLocation(program, 'a_color');
    const resolutionUniformLocation = gl.getUniformLocation(program, 'u_resolution');
    const positionBuffer = gl.createBuffer();
    this.positionBuffer = positionBuffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.enableVertexAttribArray(positionAttributeLocation);
    const size = 2;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.vertexAttribPointer(positionAttributeLocation, size, type, normalize, stride, offset);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(this.canvasBGColor.r, this.canvasBGColor.g, this.canvasBGColor.b, this.canvasBGColor.a);

    const colorBuffer = gl.createBuffer();
    this.colorBuffer = colorBuffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    const vaoColor = gl.createVertexArray();
    gl.enableVertexAttribArray(colorAttributeLocation);
    gl.vertexAttribPointer(colorAttributeLocation, 4, gl.FLOAT, false, 0, 0);



    gl.useProgram(program);
    gl.bindVertexArray(vao);
    gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);

    this.webglActive = true;

  }

  createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
      return shader;
    }

    console.log('SHADER COMPILE FAILURE');
    console.log(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
  }

  createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    const success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
      return program;
    }

    console.log('PROGRAM LINK FAILURE');
    console.log(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
  }

  onwebglcontextlost(evt) {
    evt.preventDefault();
    this.webglActive = false;
  }

  onwebglcontextrestored(evt) {
    this.initializeWebGL();
    if (this.triangleCount !== undefined) {
      this.initArrays(this.triangleCount);
    }
  }

  //call this to re-size the points buffer and create the positionArray
  //pointCount should be a positive integer, the maximum number of 
  // x, y points you expect to store in your array
  initPositions(pointCount) {
    const bytesPerCount = 4; //because the coords are floats
    const countPerPoint = 2; //because we have x and y 
    const totalBytes = pointCount * countPerPoint * bytesPerCount;
    this.maxPointCount = pointCount * countPerPoint;
    this.positionArray = new Float32Array(this.maxPointCount);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, totalBytes, this.gl.DYNAMIC_DRAW);
  }

  //positions must be a Float32Array
  setPositions(positions) {
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, positions);
    this.pointCount = positions.length >> 1;
  }

  //call this to re-size the color buffer and create the colorArray
  //pointCount should be a positive integer, the maximum number of
  //r,g,b,a points you expect to store in your array
  initColors(pointCount) {
    const bytesPerCount = 4;
    const countPerPoint = 4;
    const totalBytes = pointCount * countPerPoint * bytesPerCount;
    this.maxColorCount = pointCount * countPerPoint;
    this.colorArray = new Float32Array(this.maxColorCount);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, totalBytes, this.gl.DYNAMIC_DRAW);
  }

  //colors must be a Float32Array
  setColors(colors) {
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
    this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, colors);
  }

  //call this to init the position and colors arrays to hold data for
  //no more than triangleCount triangles
  initArrays(triangleCount) {
    this.triangleCount = triangleCount;
    const pointsPerTriangle = 3;
    const pointCount = triangleCount * pointsPerTriangle;
    this.initPositions(pointCount);
    this.initColors(pointCount);
  }

  //call this to render your triangles
  //you can set triangleCount to limit the triangles drawn or you can
  //leave it undefined to draw everything from the add* calls since the last draw
  draw(triangleCount) {
    if (this.updatedPositions) {
      this.setPositions(this.positionArray);
    }
    if (this.updatedColors) {
      this.setColors(this.colorArray);
    }

    const pointsPerTriangle = 3;
    const pointCount = triangleCount === undefined ? (this.nextPointIndex >> 1) : (triangleCount * pointsPerTriangle);

    if (this.webglActive) {
      //don't draw when context lost
      this.gl.clear(this.gl.COLOR_BUFFER_BIT);
      this.gl.drawArrays(this.gl.TRIANGLES, 0, pointCount);
    }

    this.updatedPositions = false;
    this.updatedColors = false;
  }

  resetTriangleIndexes() {
    this.nextPointIndex = 0;
    this.nextColorIndex = 0;
  }

  //add triangle to be drawn with specified coordinates and color
  //coordinates are in pixel coords on canvas
  //color values are [0,1]
  addTriangle(x0, y0, x1, y1, x2, y2, r, g, b, a) {
    const pointsToAdd = 6;
    const colorsToAdd = 12;
    if ((this.nextPointIndex + pointsToAdd > this.maxPointCount) ||
        (this.nextColorIndex + colorsToAdd > this.maxColorCount)) {
      return false;
    }
    this.positionArray[this.nextPointIndex++] = x0;
    this.positionArray[this.nextPointIndex++] = y0;
    this.positionArray[this.nextPointIndex++] = x1;
    this.positionArray[this.nextPointIndex++] = y1;
    this.positionArray[this.nextPointIndex++] = x2;
    this.positionArray[this.nextPointIndex++] = y2;

    this.colorArray[this.nextColorIndex++] = r;
    this.colorArray[this.nextColorIndex++] = g;
    this.colorArray[this.nextColorIndex++] = b;
    this.colorArray[this.nextColorIndex++] = a;
    this.colorArray[this.nextColorIndex++] = r;
    this.colorArray[this.nextColorIndex++] = g;
    this.colorArray[this.nextColorIndex++] = b;
    this.colorArray[this.nextColorIndex++] = a;
    this.colorArray[this.nextColorIndex++] = r;
    this.colorArray[this.nextColorIndex++] = g;
    this.colorArray[this.nextColorIndex++] = b;
    this.colorArray[this.nextColorIndex++] = a;

    this.updatedPositions = true;
    this.updatedColors = true;
    return true;
  }

  addRect(x0, y0, w, h, r, g, b, a) {
    this.addTriangle(x0, y0, x0 + w, y0, x0, y0 + h, r, g, b, a);
    this.addTriangle(x0 + w, y0, x0 + w, y0 + w, x0, y0 + w, r, g, b, a);
  }

}
