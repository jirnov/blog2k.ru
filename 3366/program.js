(function() {

    "use strict";

    // Исходники вершинного шейдера 
    const vertexShaderSource = [
        // Позиция вершины
        "attribute vec3 a_position;",
        "",
        // Матрица транформации вершины
        "uniform mat4 u_modelViewProjection;",
        "",
        // Цвет пикселя
        "varying vec3 v_color;",
        "",
        "void main() {",
        //   Вычисляем позицию вершины
        "    gl_Position = u_modelViewProjection * vec4(a_position, 1.0);",
        //   Передаем цвет вершины в пиксельный шейдер в зависимости от позиции
        "    v_color = (a_position + 3.0) / 6.0;",
        "}"
    ].join("\n");

    const fragmentShaderSource = [
        // Точность типа float наивысшая
        "precision highp float;",
        "",
        // Цвет пикселя
        "varying vec3 v_color;",
        "",
        "void main() {",
        //   Установка цвета пикселя
        "    gl_FragColor = vec4(v_color, 1.0);",
        "}"
    ].join("\n");

    // gl context 
    var gl;

    // Ссылка на позицию вершины в шейдере
    var positionId = 0;

    // Ссылка на матрицу транформации в шейдере
    var mvpUniform = 0;

    // Угол поворота вдоль координаты Y в градусах
    var angle = 0.0;

    // Вершинный буфер
    var vertexBuffer = 0;
    // Индексный буфер
    var indexBuffer = 0;

    // Последнее значение функции Date.now()
    var lastTime = 0;

    // Шейдер
    var program = 0;

    // Матрица транформации объекта
    const modelMatrix = mat4.create();

    // Матрица перспективной проекции камеры
    const projMatrix = mat4.create();

    // Общая матрица, которая содержит modelMatrix и projMatrix
    var modelViewProjMatrix = mat4.create();

    // Структура для передачи матрицы в шейдер
    var mvpMatrixF32 = new Float32Array(4 * 4);

    // Преобразование градусов в радианы
    function radians(deg) {
        return deg / 180.0 * Math.PI;
    }

    function update(dt) {
        // Обнуляем матрицу
        mat4.identity(modelMatrix);
        // Сдвинем объект вдоль Z на -7
        mat4.translate(modelMatrix, [0, 0, -7.0]);
        // Поворачиваем объект вдоль Y на angle градусов
        mat4.rotateY(modelMatrix, radians(angle));
        // Поворачиваем объект вдоль X на 25 градусов
        mat4.rotateX(modelMatrix, radians(25));
        // Поворачиваем объект вдоль Y на angle градусов
        mat4.rotateZ(modelMatrix, radians(angle));

        // Угол поворота вдоль Y (30 градусов в секунду)
        angle += 30 * dt;

        // Совместим две матрицы в одну
        mat4.multiply(projMatrix, modelMatrix, modelViewProjMatrix);
    }

    function drawFrame() {
        // Очистка экрана
        gl.clearColor(0xFF / 255.0, 0xFF / 255.0, 0xFF / 255.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Выключаем обратной стороны треугольников
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);

        // Включаем тест глубины
        gl.enable(gl.DEPTH_TEST);

        // Включаем шейдер
        gl.useProgram(program);

        // Загружаем данные меша
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

        // Указатель на позицию вершины в vertexBuffer
        gl.vertexAttribPointer(positionId, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(positionId);

        mvpMatrixF32.set(modelViewProjMatrix);

        // Загружаем матрицу в шейдер
        gl.uniformMatrix4fv(mvpUniform, false, mvpMatrixF32);

        // Рисуем наш объект
        gl.drawElements(gl.TRIANGLES, indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
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

    function main(canvasName) {
        var canvas = document.getElementById(canvasName);

        // Получаем gl context
        gl = canvas.getContext("experimental-webgl");
        gl.viewport(0, 0, canvas.width, canvas.height);

        // Инициализация матрицы перспективной проекции
        mat4.perspective(70, canvas.width / canvas.height, 0.1, 20.0, projMatrix);

        // Создаем и компилируем шейдер
        program = compileShader(vertexShaderSource, fragmentShaderSource);

        // Ссылка на аттрибут a_position
        positionId = gl.getAttribLocation(program, "a_position");

        // Ссылка на матрицу транформации
        mvpUniform =
            gl.getUniformLocation(program, "u_modelViewProjection");

        // Список вершин
        const vertices = [
            -1, 3, 1, //  0
            1, 3, 1, //  1
            1, 3, -1, //  2
            -1, 3, -1, //  3
            -1, 1, 3, //  4
            1, 1, 3, //  5
            1, 1, 1, //  6
            3, 1, 1, //  7
            3, 1, -1, //  8
            1, 1, -1, //  9
            1, 1, -3, // 10
            -1, 1, -3, // 11
            -1, 1, -1, // 12
            -3, 1, -1, // 13
            -3, 1, 1, // 14
            -1, 1, 1, // 15
            -1, -1, 3, // 16
            1, -1, 3, // 17
            1, -1, 1, // 18
            3, -1, 1, // 19
            3, -1, -1, // 20
            1, -1, -1, // 21
            1, -1, -3, // 22
            -1, -1, -3, // 23
            -1, -1, -1, // 24
            -3, -1, -1, // 25
            -3, -1, 1, // 26
            -1, -1, 1, // 27
            -1, -3, 1, // 28
            1, -3, 1, // 29
            1, -3, -1, // 30
            -1, -3, -1, // 31
        ];

        // Список индексов
        const indices = [
            0, 1, 3, 1, 2, 3,
            4, 5, 15, 5, 6, 15,
            6, 7, 9, 7, 8, 9,
            12, 9, 11, 9, 10, 11,
            14, 15, 13, 15, 12, 13,
            27, 17, 16, 27, 18, 17,
            21, 19, 18, 21, 20, 19,
            23, 21, 24, 23, 22, 21,
            25, 27, 26, 25, 24, 27,
            31, 29, 28, 31, 30, 29,
            16, 17, 4, 17, 5, 4,
            17, 18, 5, 18, 6, 5,
            18, 19, 6, 19, 7, 6,
            19, 20, 7, 20, 8, 7,
            9, 20, 21, 9, 8, 20,
            21, 22, 9, 22, 10, 9,
            11, 22, 23, 11, 10, 22,
            12, 23, 24, 12, 11, 23,
            13, 24, 25, 13, 12, 24,
            14, 25, 26, 14, 13, 25,
            26, 27, 14, 27, 15, 14,
            4, 27, 16, 4, 15, 27,
            15, 6, 0, 6, 1, 0,
            6, 9, 1, 9, 2, 1,
            3, 9, 12, 3, 2, 9,
            0, 12, 15, 0, 3, 12,
            28, 29, 27, 29, 18, 27,
            29, 30, 18, 30, 21, 18,
            24, 30, 31, 24, 21, 30,
            27, 31, 28, 27, 24, 31,
        ];

        // Создаем VertexBufferObject типа ARRAY_BUFFER
        vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        // Создаем VertexBufferObject типа ELEMENT_ARRAY_BUFFER
        indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

        // Сохраним количество индексов
        indexBuffer.numItems = indices.length;

        // Поехали!
        render();
    }


    window.PolyCubeDemo = {
        startRender: function(canvasName) {
            main(canvasName);
        }
    }

})();
