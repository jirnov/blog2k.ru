(function() {

    "use strict";

    var vertexShaderSource = [
        "attribute vec2 a_position;",
        "attribute vec2 a_texCoord;",
        "",
        "varying vec2 v_texCoord;",
        "",
        "void main() {",
        "    gl_Position = vec4(a_position, 0.0, 1.0);",
        "    v_texCoord = a_texCoord;",
        "}"
    ].join("\n");

    var fragmentShaderSource = [
        "precision highp float;",
        "",
        "uniform sampler2D u_diffuse;",
        "uniform sampler2D u_normalMap;",
        "uniform sampler2D u_specularMap;",
        "uniform vec2 u_lightPos;",
        "",
        "varying vec2 v_texCoord;",
        "",
        "void main() {",
        "    vec3 n = texture2D(u_normalMap, v_texCoord).rgb;",
        "    n = normalize(vec3(2.0 * n.xy - 1.0, n.z));",
        "    vec3 l = normalize(vec3(u_lightPos - v_texCoord, 0.5));",
        "    float a = dot(n, l);",
        "    vec3 c = texture2D(u_diffuse, v_texCoord).rgb;",
        "    float s = texture2D(u_specularMap, v_texCoord).r;",
        "    gl_FragColor = vec4(c * (a + s * pow(a, 32.0)), 1.0);",
        "}"
    ].join("\n");

    var gl;

    var positionId = 0;
    var texCoordId = 0;

    var diffuseUniform = 0;
    var normalMapUniform = 0;
    var specularMapUniform = 0;

    var lightPosId = 0;

    var diffuseTex = 0;
    var normalMapTex = 0;
    var specularMapTex = 0;

    var lightPos = [0, 0];

    var vbo = 0;

    var program = 0;


    function render() {
        requestAnimationFrame(render);

        if (!diffuseTex || !diffuseTex.loaded) {
            return;
        }

        if (!normalMapTex || !normalMapTex.loaded) {
            return;
        }

        if (!specularMapTex || !specularMapTex.loaded) {
            return;
        }

        // Включаем шейдер
        gl.useProgram(program);

        // Используем VertexBufferObject
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

        // Указатель на позицию вершины в vbo
        gl.vertexAttribPointer(
            positionId,
            2,
            gl.FLOAT,
            false,
            4 * Float32Array.BYTES_PER_ELEMENT,
            0);

        gl.enableVertexAttribArray(positionId);

        // Указатель на текстурные координаты в vbo
        gl.vertexAttribPointer(
            texCoordId,
            2,
            gl.FLOAT,
            false,
            4 * Float32Array.BYTES_PER_ELEMENT,
            2 * Float32Array.BYTES_PER_ELEMENT);

        gl.enableVertexAttribArray(texCoordId);

        // Активируем нулевой текстурный юнит
        gl.activeTexture(gl.TEXTURE0);
        // Устанавливаем в нулевой текстурный юнит текстуру diffuseTex
        gl.bindTexture(gl.TEXTURE_2D, diffuseTex);
        // Параметр u_diffuse использует нулевой текстурный юнит
        gl.uniform1i(diffuseUniform, 0);

        // Активируем первый текстурный юнит
        gl.activeTexture(gl.TEXTURE1);
        // Устанавливаем в первый текстурный юнит текстуру normalMapTex
        gl.bindTexture(gl.TEXTURE_2D, normalMapTex);
        // Параметр u_normalMap использует первый текстурный юнит
        gl.uniform1i(normalMapUniform, 1);

        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, specularMapTex);
        gl.uniform1i(specularMapUniform, 2);

        // Обновляем параметр u_lightPos
        gl.uniform2f(lightPosId, lightPos[0], lightPos[1]);

        // Рисуем TRIANGLE_STRIP из четырех вершин
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    function handleLoadedTexture(texture) {
        // Работает с текстурой
        gl.bindTexture(gl.TEXTURE_2D, texture);
        // Инвертируем изображение по Y
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        // Загружаем текстуру в WebGL формата RGB и один байт на цвет
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, texture.image);
        // Линейная фильтрация
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        // Обрезать текстуру по краям
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        // Завершили работу с текстурой
        gl.bindTexture(gl.TEXTURE_2D, null);

        texture.loaded = true;
    }


    function compileShader(vsSource, fsSource) {
        // Компилируем вершинный шейдер
        var vShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vShader, vsSource);
        gl.compileShader(vShader);

        // Компилируем фрагментный шейдер
        var fShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fShader, fsSource);
        gl.compileShader(fShader);

        // Собираем оба шейдера в программу
        program = gl.createProgram();
        gl.attachShader(program, vShader);
        gl.attachShader(program, fShader);
        gl.linkProgram(program);
        return program;
    }


    function loadTexture(url) {
        var texture = gl.createTexture();
        texture.loaded = false;
        texture.image = new Image();
        texture.image.onload = function() {
            handleLoadedTexture(texture);
        }
        texture.image.crossOrigin = 'anonymous';
        texture.image.src = url;
        return texture;
    }


    function main(canvasName) {
        var canvas = document.getElementById(canvasName);

        canvas.onmousemove = function(event) {
            var bbox = canvas.getBoundingClientRect();

            var x = (event.clientX - bbox.left) * (canvas.width / bbox.width);
            var y = (event.clientY - bbox.top) * (canvas.height / bbox.height);

            lightPos[0] = x / (canvas.width);
            lightPos[1] = 1.0 - y / canvas.height;
        }

        gl = canvas.getContext("experimental-webgl");
        gl.viewport(0, 0, canvas.width, canvas.height);

        // Создаем и компилируем шейдер
        program = compileShader(vertexShaderSource, fragmentShaderSource);

        // Ссылка на аттрибут a_position
        positionId = gl.getAttribLocation(program, "a_position");
        // Ссылка на аттрибут a_texCoord
        texCoordId = gl.getAttribLocation(program, "a_texCoord");

        // Ссылка на u_diffuse
        diffuseUniform = gl.getUniformLocation(program, "u_diffuse");
        // Ссылка на u_normalMap
        normalMapUniform = gl.getUniformLocation(program, "u_normalMap");
        // Ссылка на u_specularMap
        specularMapUniform = gl.getUniformLocation(program, "u_specularMap");
        // Ссылка на u_lightPos
        lightPosId = gl.getUniformLocation(program, "u_lightPos");

        var scriptUrl = document.currentScript.src;

        // Создаем и загружаем текстуру с цветом
        diffuseTex = loadTexture("https://cdn.jsdelivr.net/gh/jirnov/blog2k.ru@latest/3346/color.jpg");

        // Создаем и загружаем текстуру с картой нормалей
        normalMapTex = loadTexture("https://cdn.jsdelivr.net/gh/jirnov/blog2k.ru@latest/3346/normal.png");

        // Создаем и загружаем карту бликов
        specularMapTex = loadTexture("https://cdn.jsdelivr.net/gh/jirnov/blog2k.ru@latest/3346/specular.jpg");

        // Вершины x, y, u, v
        var vertices = [
            -1.0, -1.0, 0.0, 0.0,
            1.0, -1.0, 1.0, 0.0,
            -1.0, 1.0, 0.0, 1.0,
            1.0, 1.0, 1.0, 1.0,
        ];

        // Создаем VertexBufferObject
        vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        // Поехали!
        render();
    }

    window.LightDemo = {
        startRender: function(canvasName) {
            main(canvasName);
        }
    }

})();
