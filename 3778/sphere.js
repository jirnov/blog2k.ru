(function() {

    const sphereVS = [
        "varying vec3 v_Normal;",

        "void main() {",
        "v_Normal = normal;",
        "gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
        "}"
    ].join("\n");

    const sphereFS = [
        "precision highp float;",

        "uniform vec3 u_lightDir;",

        "varying vec3 v_Normal;",

        "void main() {",
        "vec3 n = normalize(v_Normal);",
        "vec3 l = normalize(u_lightDir);",

        "float lambertian = max(0.0, dot(n, l));",
        "float specular = 0.0;",

        "if (lambertian > 0.0) {",
        "vec3 v = vec3(0, 0, 1);",
        "vec3 r = reflect(-l, n);",
        "float specAngle = max(0.0, dot(r, v));",
        "specular = pow(specAngle, 30.0);",
        "}",

        "vec3 diffuseColor = vec3(1.0, 0.0, 0.0) * lambertian;",
        "vec3 specularColor = vec3(0.0, 1.0, 0.0) * specular;",
        "vec3 color = diffuseColor + specularColor;",

        "gl_FragColor = vec4(color, 1.0);",
        "}",
    ].join("\n");

    const planeVS = [
        "uniform mat4 u_invProj;",

        "varying vec2 v_TexCoord;",
        "varying vec3 v_Projected;",

        "void main() {",
        "v_TexCoord = uv;",

        "vec4 projected = u_invProj * vec4(uv * 2.0 - 1.0, 0.0, 1.0);",
        "v_Projected = projected.xyz / projected.w;",
        "gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
        "}",
    ].join("\n");

    const planeFS = [
        "precision highp float;",

        "uniform vec3 u_lightDir;",
        "uniform float u_distToCamera;",
        "uniform float u_radius;",

        "varying vec2 v_TexCoord;",
        "varying vec3 v_Projected;",

        "vec3 getNormal(vec3 projected) {",
        // Позиция камеры в пространстве камеры
        "vec3 p0 = vec3(0, 0, 0);",
        // Направление от плоскости к камере
        "vec3 v = normalize(p0 - projected);",
        // Позиция сферы в пространстве камеры
        "vec3 o = vec3(0, 0, -u_distToCamera);",
        "float tca = dot(o, v);",
        "float sqD = dot(o, o) - tca * tca;",
        "float r = u_radius;",
        "float thc = sqrt(r * r - sqD);",
        "vec3 p = p0 + (tca + thc) * v;",
        "return normalize(p - o);",
        "}",

        "void main() {",
        "vec3 n = getNormal(v_Projected.xyz);",
        "vec3 l = normalize(u_lightDir);",

        "float lambertian = max(0.0, dot(n, l));",
        "float specular = 0.0;",

        "if (lambertian > 0.0) {",
        "vec3 v = vec3(0, 0, 1);",
        "vec3 r = reflect(-l, n);",
        "float specAngle = max(0.0, dot(r, v));",
        "specular = pow(specAngle, 30.0);",
        "}",

        "vec3 diffuseColor = vec3(1.0, 0.0, 0.0) * lambertian;",
        "vec3 specularColor = vec3(0.0, 1.0, 0.0) * specular;",
        "vec3 color = diffuseColor + specularColor;",

        // Небольшой хак для сглаживания краев нашей сферы
        "float edge = 0.995;",
        "vec2 coords = v_TexCoord * 2.0 - 1.0;",
        "float t = length(coords);",
        "float a = clamp((t - edge) / (1.0 - edge), 0.0, 1.0);",
        "vec4 c4 = mix(vec4(color, 1.0), vec4(color, 0.0), a);",

        "gl_FragColor = vec4(c4);",
        "}",
    ].join("\n");


    const RADIUS = 5.0;
    const CAMDIST = 15.0;

    var planeScene;
    var planeUniforms;

    var sphereScene;
    var sphereUniforms;

    var camera;
    var renderer;

    var canvas;
    var canvasWidth;
    var canvasHeight;

    function createPlaneScene(camera) {
        var scene = new THREE.Scene();

        var D = CAMDIST;
        var R = RADIUS;

        var L = Math.sqrt(D * D - R * R);
        var h = R * (D - R) / L;

        var fov = Math.acos(L / D) * 2.0;

        var projMatrix = new THREE.Matrix4();
        projMatrix.makePerspective(fov * THREE.Math.RAD2DEG, 1.0, D - R, D + R);

        var invProjMatrix = projMatrix.getInverse(projMatrix);

        planeUniforms = {
            "u_lightDir": {
                value: new THREE.Vector3(0, 0, 1)
            },
            "u_invProj": {
                value: invProjMatrix
            },
            "u_distToCamera": {
                value: D
            },
            "u_radius": {
                value: R
            },
        };

        var material = new THREE.ShaderMaterial({
            vertexShader: planeVS,
            fragmentShader: planeFS,
            uniforms: planeUniforms,
            transparent: true,
        });

        var geometry = new THREE.PlaneGeometry(1, 1, 1, 1);
        var plane = new THREE.Mesh(geometry, material);

        plane.position.z = R;
        plane.scale.x = h * 2;
        plane.scale.y = h * 2;

        scene.add(plane);
        return scene;
    }


    function createSphereScene() {
        var scene = new THREE.Scene();

        sphereUniforms = {
            "u_lightDir": {
                value: new THREE.Vector3(0, 0, 1)
            },
        };

        var material = new THREE.ShaderMaterial({
            vertexShader: sphereVS,
            fragmentShader: sphereFS,
            uniforms: sphereUniforms
        });

        var geometry = new THREE.SphereGeometry(RADIUS, 32, 32);
        var sphere = new THREE.Mesh(geometry, material);
        scene.add(sphere);

        return scene;
    }


    function onResize() {
        canvasWidth = canvas.width;
        canvasHeight = canvas.height;

        renderer.setSize(canvasWidth, canvasHeight, false);

        camera.aspect = canvasWidth * 0.5 / canvasHeight;
        camera.updateProjectionMatrix();
    }


    function init(canvasName) {
        canvas = document.getElementById(canvasName);

        canvasWidth = canvas.width;
        canvasHeight = canvas.height;

        camera = new THREE.PerspectiveCamera(
            45.0,
            canvasWidth * 0.5 / canvasHeight,
            1.0,
            50.0);

        camera.position.z = CAMDIST;

        sphereScene = createSphereScene();
        planeScene = createPlaneScene();

        renderer = new THREE.WebGLRenderer({
            antialias: true,
            canvas: canvas
        });
        renderer.setSize(canvasWidth, canvasHeight, false);
        renderer.setClearColor(0x000000);
        renderer.setScissorTest(true);

        canvas.addEventListener('resize', onResize, false);
    }


    function render() {
        requestAnimationFrame(render);

        var w = canvasWidth;
        var hw = Math.floor(0.5 * w);
        var h = canvasHeight;

        renderer.setViewport(0, 0, hw, h);
        renderer.setScissor(0, 0, hw, h);
        renderer.render(sphereScene, camera);

        renderer.setViewport(hw, 0, hw, h);
        renderer.setScissor(hw, 0, hw, h);
        renderer.render(planeScene, camera);

        var rotation = (Date.now() / 50) % 360.0;

        var x = 0;
        var y = 1;
        var z = 1;

        var a = rotation * THREE.Math.DEG2RAD;
        var c = Math.cos(a);
        var s = Math.sin(a);

        var lightDir = new THREE.Vector3(
            x * c - z * s,
            y,
            z * c + x * s);

        planeUniforms.u_lightDir.value = lightDir;
        sphereUniforms.u_lightDir.value = lightDir;
    }

    window.SphereDemo = {
        startRender: function(canvasName) {
            init(canvasName);
            render();
        }
    }

})();
