var canvas;
var context;
var mousePos;

var width = 3;
var height = 3;

var image = [
    0xC0, 0x40, 0x60,
    0x40, 0xFF, 0x20,
    0x10, 0x80, 0xC0
];

function colorToString(color) {
    if (color === undefined) {
        return "#000000";
    }
    var c = color.toString(16);
    return "#" + c + + c + c;

}

function render() {
    var screenW = canvas.width;
    var screenH = canvas.height;

    // Рисуем девять квадратов разным цветом
    for (var y = 0; y < height; ++y) {
        for (var x = 0; x < width; ++x) {
            var l = x * (screenW / width);
            var t = y * (screenH / height);

            context.fillStyle = colorToString(image[y * width + x]);
            context.fillRect(l, t, screenW / width, screenH / height);
        }
    }

    if (mousePos) {
        var sx = screenW / width;
        var sy = screenH / height;

        var x = mousePos.x / screenW * width;
        var y = mousePos.y / screenH * height;

        if (x < 0.5) {             
            x = 0.5;         
        }         
        else if (x > width - 0.5) {
            x = width - 0.5;
        }

        if (y < 0.5) {             
            y = 0.5;         
        }         
        else if(y > height - 0.5) {
            y = height - 0.5;
        }

        x -= 0.5;
        y -= 0.5;

        var intX = Math.floor(x);
        var intY = Math.floor(y);

        var u = x - intX;
        var v = y - intY;

        // Выход за пределы справа
        var outX = (intX + 1 > width - 1);
        // Выход за пределы снизу
        var outY = (intY + 1 > height - 1);

        // Центральный пиксель
        var p1 = image[intY * width + intX];
        // Справа
        var p2 = p1;
        // Снизу
        var p3 = p1;
        // Справа и снизу
        var p4 = p1

        if (!outX && !outY) {
            p2 = image[intY * width + intX + 1];
            p3 = image[(intY + 1) * width + intX];
            p4 = image[(intY + 1) * width + intX + 1]

        }                
        else if (outX && outY) {
            // Nothing to do
        }
        else if (outX) {
            p3 = image[(intY + 1) * width + intX];
            p4 = p3;
        }
        else if (outY) {
            p2 = image[intY * width + intX + 1];
            p4 = p2;
        }

        // Интерполяция между горизонтальными соседями
        var x0 = p1 + u * (p2 - p1);
        var x1 = p3 + u * (p4 - p3);
        // Интерполяция по вертикали
        var c = x0 + v * (x1 - x0);

        var rectX = mousePos.x - sx / 4;
        var rectY = mousePos.y - sy / 4
        var rectW = sx / 2;
        var rectH = sy / 2;

        // Рисуем зеленый прямоугольник
        context.beginPath();
        context.lineWidth = "5";
        context.strokeStyle = "green";
        context.rect(rectX, rectY, rectW, rectH);
        context.stroke();

        // Закрашиваем зеленый прямоугольник
        context.fillStyle = colorToString(Math.ceil(c));
        context.fillRect(rectX, rectY, rectW, rectH);
    }

    requestAnimationFrame(render);

}

window.BilinearDemo = window.BilinearDemo || {};

window.BilinearDemo.startRender = function(canvasName) {
    canvas = document.getElementById(canvasName);
    context = canvas.getContext("2d");

    canvas.onmousemove = function(event) {
        var rect = canvas.getBoundingClientRect();

        mousePos = {
            x : (event.clientX - rect.left) * (canvas.width / rect.width),
            y : (event.clientY - rect.top) * (canvas.height / rect.height)
        };
    }

    render();
}