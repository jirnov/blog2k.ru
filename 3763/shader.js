(function() {
"use strict";
 
const vertexShaderSource = [
    "attribute vec3 a_Position;",
    "attribute vec2 a_TexCoord;",
    "attribute vec3 a_Normal;",
    "attribute vec3 a_Binormal;",
    "attribute vec3 a_Tangent;",

    "uniform mat4 u_MVPMatrix;",
    "uniform mat4 u_ModelView;",

    "varying vec2 v_TexCoord;",
    "varying vec3 v_LightDir;",
    "varying vec3 v_ViewDir;",

    "void main() {",
    "    vec3 worldSpaceVertex = (u_ModelView * vec4(a_Position, 1.0)).xyz;",
    "    vec3 lightDir = normalize(vec3(0, 0, 10) - worldSpaceVertex);",
    "    vec3 viewDir = normalize(vec3(0, 0, 10) - worldSpaceVertex);",

    "    vec3 trNormal = normalize((u_ModelView * vec4(a_Normal, 0.0)).xyz);",
    "    vec3 trBinormal = normalize((u_ModelView * vec4(a_Binormal, 0.0)).xyz);",
    "    vec3 trTangent = normalize((u_ModelView * vec4(a_Tangent, 0.0)).xyz);",

    "    mat3 normalSpace = mat3(trTangent, trBinormal, trNormal);",

    "    v_TexCoord = a_TexCoord;",
    "    v_LightDir = normalize(lightDir * normalSpace);",
    "    v_ViewDir = normalize(viewDir * normalSpace);",

    "    gl_Position = u_MVPMatrix * vec4(a_Position, 1.0);",
    "}"
].join("\n");
 
const fragmentShaderSource = [
    "precision lowp float;",

    "uniform sampler2D u_DiffuseTex;",
    "uniform sampler2D u_NormalMap;",
    "uniform sampler2D u_SpecularMap;",

    "varying vec2 v_TexCoord;",
    "varying vec3 v_LightDir;",
    "varying vec3 v_ViewDir;",

    "const float screenGamma = 2.2;",
    "const vec3 specularColor = vec3(0.2, 0.2, 0.2);",
    "const float shininess = 32.0;",

    "uniform int u_EnableAmbient;",
    "uniform int u_EnableDiffuse;",
    "uniform int u_EnableSpecular;",

    "void main() {",
    "    vec3 diffuseColor = texture2D(u_DiffuseTex, v_TexCoord).rgb;",
    "    float s = texture2D(u_SpecularMap, v_TexCoord).r;",

    "    vec3 normal = texture2D(u_NormalMap, v_TexCoord).rgb * 2.0 - 1.0;",
    "    normal = normalize(normal);",
    "    vec3 lightDir = normalize(v_LightDir);",

    "    float lambertian = max(0.0, dot(lightDir, normal));",
    "    float specular = 0.0;",

    "    if (lambertian > 0.0) {",
    "        vec3 viewDir = normalize(v_ViewDir);",
    "        vec3 halfDir = normalize(lightDir + viewDir);",

    "        float specAngle = max(dot(halfDir, normal), 0.0);",
    "        specular = pow(specAngle, shininess * s);",
    "    }",

    "    if (0 == u_EnableAmbient) {",
    "        lambertian = 1.0;",
    "    }",

    "    if (0 == u_EnableDiffuse) {",
    "        diffuseColor = vec3(0.6, 0.6, 0.6);",
    "    }",

    "    if (0 == u_EnableSpecular) {",
    "        specular = 0.0;",
    "    }",

    "    vec3 colorLinear = diffuseColor * lambertian + specularColor * specular;",
    "    gl_FragColor = vec4(colorLinear, 1.0);",
    "}"
].join("\n");
 
var gl;

// Attributes
var positionId = 0;
var texCoordId = 0;
var normalId = 0;
var binormalId = 0;
var tangentId = 0;

// Uniform
var mvpMatrixUniform = 0;
var modelViewUniform = 0;
var diffuseTexUniform = 0;
var normalMapUniform = 0;
var specularMapUniform = 0;
var enableAmbientUniform = 0;
var enableDiffuseUniform = 0;
var enableSpecularUniform = 0;
 
// Vertex Buffer
var vertexBuffer = 0;

// Shader
var shaderProgram = 0; 

// Textures
var diffuseTexture = 0;
var normalMapTexture = 0;
var specularMapTexture = 0;

// Matrices
var modelMatrix = mat4.create();
var projMatrix = mat4.create();
var viewMatrix = mat4.create();
var modelViewMatrix = mat4.create();
var mvpMatrix = mat4.create();

// Others
var lastTime = 0;
var settings = 0;
var rotation = 0.0;


function createPlane(zDir, yDir)
{
    vec3.normalize(zDir, zDir);
    vec3.normalize(yDir, yDir);

    var xDir = vec3.create();
    vec3.cross(xDir, yDir, zDir);
    vec3.normalize(xDir, xDir);

    var transform = mat3.fromValues(
        xDir[0], yDir[0], zDir[0],
        xDir[1], yDir[1], zDir[1],
        xDir[2], yDir[2], zDir[2]);

    mat3.transpose(transform, transform);
    
    var v0 = vec3.fromValues(-1, -1, 1);
    var v1 = vec3.fromValues(1, -1, 1);
    var v2 = vec3.fromValues(-1, 1, 1);
    var v3 = vec3.fromValues(1, 1, 1);

    vec3.transformMat3(v0, v0, transform);
    vec3.transformMat3(v1, v1, transform);
    vec3.transformMat3(v2, v2, transform);
    vec3.transformMat3(v3, v3, transform);

    var uv0 = vec2.fromValues(0, 0);
    var uv1 = vec2.fromValues(1, 1);

    return [
        v0[0], v0[1], v0[2], uv0[0], uv0[1], zDir[0], zDir[1], zDir[2], yDir[0], yDir[1], yDir[2], xDir[0], xDir[1], xDir[2],
        v1[0], v1[1], v1[2], uv1[0], uv0[1], zDir[0], zDir[1], zDir[2], yDir[0], yDir[1], yDir[2], xDir[0], xDir[1], xDir[2],
        v2[0], v2[1], v2[2], uv0[0], uv1[1], zDir[0], zDir[1], zDir[2], yDir[0], yDir[1], yDir[2], xDir[0], xDir[1], xDir[2],

        v1[0], v1[1], v1[2], uv1[0], uv0[0], zDir[0], zDir[1], zDir[2], yDir[0], yDir[1], yDir[2], xDir[0], xDir[1], xDir[2],
        v3[0], v3[1], v3[2], uv1[0], uv1[1], zDir[0], zDir[1], zDir[2], yDir[0], yDir[1], yDir[2], xDir[0], xDir[1], xDir[2],
        v2[0], v2[1], v2[2], uv0[0], uv1[1], zDir[0], zDir[1], zDir[2], yDir[0], yDir[1], yDir[2], xDir[0], xDir[1], xDir[2],
    ];
}


function render() {
    requestAnimationFrame(render);

    var time = Date.now();
    var dt = 1000 / 30.0;

    if (lastTime != 0) {
        dt = (time - lastTime) * 0.001;
    }
    lastTime = time;

    update(dt);
    drawFrame();
}


function update(dt) {
    rotation -= settings.rotationSpeed * dt;

    if (rotation < -360) {
        rotation += 360;
    }
    if (rotation > 360) {
        rotation -= 360;
    }

    var a = glMatrix.toRadian(rotation);
    
    mat4.identity(modelMatrix);
    mat4.rotate(modelMatrix, modelMatrix, a, vec3.fromValues(0, 1, 0));

    mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);
    mat4.multiply(mvpMatrix, projMatrix, modelViewMatrix);
}
 
 
function drawFrame() {
    if (!diffuseTexture || !diffuseTexture.loaded ||
        !normalMapTexture || !normalMapTexture.loaded ||
        !specularMapTexture || !specularMapTexture.loaded ||
        !shaderProgram) {        
        return;
    }

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.enable(gl.CULL_FACE);
    
    gl.useProgram(shaderProgram);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    gl.vertexAttribPointer(
        positionId,
        3,
        gl.FLOAT,
        false,
        14 * Float32Array.BYTES_PER_ELEMENT,
        0);

    gl.enableVertexAttribArray(positionId);

    gl.vertexAttribPointer(
        texCoordId,
        2,
        gl.FLOAT,
        false,
        14 * Float32Array.BYTES_PER_ELEMENT,
        3 * Float32Array.BYTES_PER_ELEMENT);

    gl.enableVertexAttribArray(texCoordId);

    gl.vertexAttribPointer(
        normalId,
        3,
        gl.FLOAT,
        false,
        14 * Float32Array.BYTES_PER_ELEMENT,
        5 * Float32Array.BYTES_PER_ELEMENT);

    gl.enableVertexAttribArray(normalId);

    gl.vertexAttribPointer(
        binormalId,
        3,
        gl.FLOAT,
        false,
        14 * Float32Array.BYTES_PER_ELEMENT,
        8 * Float32Array.BYTES_PER_ELEMENT);

    gl.enableVertexAttribArray(binormalId);

    gl.vertexAttribPointer(
        tangentId,
        3,
        gl.FLOAT,
        false,
        14 * Float32Array.BYTES_PER_ELEMENT,
        11 * Float32Array.BYTES_PER_ELEMENT);

    gl.enableVertexAttribArray(tangentId);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, diffuseTexture);
    gl.uniform1i(diffuseTexUniform, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, normalMapTexture);
    gl.uniform1i(normalMapUniform, 1);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, specularMapTexture);
    gl.uniform1i(specularMapUniform, 2);

    gl.uniformMatrix4fv(mvpMatrixUniform, false, mvpMatrix);
    gl.uniformMatrix4fv(modelViewUniform, false, modelViewMatrix);

    gl.uniform1i(enableAmbientUniform, settings.ambient ? 1 : 0);
    gl.uniform1i(enableDiffuseUniform, settings.diffuse ? 1 : 0);
    gl.uniform1i(enableSpecularUniform, settings.specular ? 1 : 0);

    gl.drawArrays(gl.TRIANGLES, 0, 6 * 6);
}
 

function handleLoadedTexture(texture) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, texture.image);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, texture.minFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, texture.magFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, texture.repeatMode);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, texture.repeatMode);

    if (texture.minFilter == gl.LINEAR_MIPMAP_LINEAR) {
        gl.generateMipmap(gl.TEXTURE_2D);
    }

    gl.bindTexture(gl.TEXTURE_2D, null);
 
    texture.loaded = true;
}
 
 
function compileShader(vsSource, fsSource) {
    var vShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vShader, vsSource);
    gl.compileShader(vShader);

    if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) {
        console.log(gl.getShaderInfoLog(vShader));
        return null;
    }
 
    var fShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fShader, fsSource);
    gl.compileShader(fShader);

    if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) {
        console.log(gl.getShaderInfoLog(fShader));
        return null;
    } 
    
    var program = gl.createProgram();
    gl.attachShader(program, vShader);
    gl.attachShader(program, fShader);
    gl.linkProgram(program);

    return program;
}
 
 
function loadTexture(url, minFilter, magFilter, repeatMode) {
    var texture = gl.createTexture();
    texture.loaded = false;
    texture.minFilter = typeof minFilter !== 'undefined' ? minFilter : gl.LINEAR;
    texture.magFilter = typeof magFilter !== 'undefined' ? magFilter : gl.LINEAR;
    texture.repeatMode = typeof repeatMode !== 'undefined' ? repeatMode : gl.CLAMP_TO_EDGE;
    texture.image = new Image();
    texture.image.onload = function() {
        handleLoadedTexture(texture);
    }
    texture.image.crossOrigin = 'anonymous';
    texture.image.src = url;
    return texture;
}
 

var Settings = function() 
{
    this.rotationSpeed = 10.0;
    this.ambient = true;
    this.diffuse = true;
    this.specular = true;
}


function main(canvasName) {
    var canvas = document.getElementById(canvasName);
 
    mat4.perspective(
        projMatrix, 
        glMatrix.toRadian(45), 
        canvas.width / canvas.height, 
        1, 
        50);

    mat4.identity(modelMatrix);

    mat4.lookAt(
        viewMatrix,
        vec3.fromValues(3, 2, 3),
        vec3.fromValues(0, 0, 0),
        vec3.fromValues(0, 1, 0));

    gl = canvas.getContext("experimental-webgl", { antialias : true });
    gl.viewport(0, 0, canvas.width, canvas.height);
 
    shaderProgram = compileShader(vertexShaderSource, fragmentShaderSource);

    positionId = gl.getAttribLocation(shaderProgram, "a_Position");
    texCoordId = gl.getAttribLocation(shaderProgram, "a_TexCoord");
    normalId = gl.getAttribLocation(shaderProgram, "a_Normal");
    binormalId = gl.getAttribLocation(shaderProgram, "a_Binormal");
    tangentId = gl.getAttribLocation(shaderProgram, "a_Tangent");

    mvpMatrixUniform = gl.getUniformLocation(shaderProgram, "u_MVPMatrix");
    modelViewUniform = gl.getUniformLocation(shaderProgram, "u_ModelView");

    diffuseTexUniform = gl.getUniformLocation(shaderProgram, "u_DiffuseTex");
    normalMapUniform = gl.getUniformLocation(shaderProgram, "u_NormalMap");
    specularMapUniform = gl.getUniformLocation(shaderProgram, "u_SpecularMap");

    enableAmbientUniform = gl.getUniformLocation(shaderProgram, "u_EnableAmbient");
    enableDiffuseUniform = gl.getUniformLocation(shaderProgram, "u_EnableDiffuse");
    enableSpecularUniform = gl.getUniformLocation(shaderProgram, "u_EnableSpecular");

    diffuseTexture = loadTexture(
        "https://cdn.jsdelivr.net/gh/jirnov/blog2k.ru@latest/3763/diffuse.jpg",
        gl.LINEAR_MIPMAP_LINEAR, 
        gl.LINEAR);

    normalMapTexture = loadTexture(
        "https://cdn.jsdelivr.net/gh/jirnov/blog2k.ru@latest/3763/normal.jpg",
        gl.LINEAR_MIPMAP_LINEAR, 
        gl.LINEAR);

    specularMapTexture = loadTexture(
        "https://cdn.jsdelivr.net/gh/jirnov/blog2k.ru@latest/3763/specular.jpg", 
        gl.LINEAR_MIPMAP_LINEAR, 
        gl.LINEAR);

    var xPos = vec3.fromValues(1, 0, 0);
    var xNeg = vec3.fromValues(-1, 0, 0);
    var yPos = vec3.fromValues(0, 1, 0);
    var yNeg = vec3.fromValues(0, -1, 0);
    var zPos = vec3.fromValues(0, 0, 1);
    var zNeg = vec3.fromValues(0, 0, -1);

    var vertices = [];
    vertices = vertices.concat(createPlane(zPos, yPos));
    vertices = vertices.concat(createPlane(zNeg, yPos));
    vertices = vertices.concat(createPlane(xPos, yPos));
    vertices = vertices.concat(createPlane(xNeg, yPos));
    vertices = vertices.concat(createPlane(yPos, zNeg));
    vertices = vertices.concat(createPlane(yNeg, zNeg));

    vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    render();
}

window.CubeDemo = {
    startRender : function(canvasName) {
        settings = new Settings();

        var gui = new dat.GUI({autoPlace : false});
        gui.add(settings, 'rotationSpeed', -90.0, 90.0);
        gui.add(settings, 'ambient');
        gui.add(settings, 'diffuse');
        gui.add(settings, 'specular');

        var canvas = document.getElementById(canvasName);
        var container = canvas.parentElement;
        container.insertBefore(gui.domElement, canvas);

        main(canvasName);
    }
}

})();