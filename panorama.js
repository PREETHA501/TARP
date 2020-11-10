
var camera, scene, renderer;
var isUserInteracting = false;
var isPopupOpen = false;
var lon = 0;
var lat = 0;
var lonFactor = 0;
var latFactor = 0;
var phi = 0;
var theta = 0;
var projector;
var mouse = {x: 0, y: 0};
var targetList = [];
var hoverIntersected;
var composer, transitionComposer;
var panoramaData;
var isLoading = false;
var lastPanoramaUID = -1;
var mapUid = 0;

var toolTip;

var timerId;
var resolution = "default";


function startPanorama(dataURL, res) {
	resolution = res;
	setMapandNavigationHidden(true);
	init();
	isLoading = true;
	parseConfigJSON(dataURL, function (data) {
		var loader = new LocationLoader();
		loader.loadLocation(data.startLocation, startComplete);
	});
	animate();
}

function initTooltip() {
	toolTip = _('toolTip');
}


function parseConfigJSON(dataURL, callback) {
	var request = new XMLHttpRequest();
	request.open("GET", dataURL, true);
	request.onreadystatechange = function () {
		if (request.readyState === 4 && request.status === 200) {
			panoramaData = JSON.parse(request.responseText);
			callback(panoramaData);
		}
	};
	request.send(null);
}


function init() {
	camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 200);
	camera.target = new THREE.Vector3(0, 0, 1);
	projector = new THREE.Projector();
	if (Detector.webgl) {
		renderer = new THREE.WebGLRenderer({antialias: true});
	} else {
		renderer = new THREE.CanvasRenderer();
	}
	renderer.setSize(window.innerWidth, window.innerHeight);
	var container = _('panorama');
	container.appendChild(renderer.domElement);
	initTooltip()
}

function startComplete(location) {
	var panoScene = new THREE.Scene();
	panoScene.add(location);
	scene = panoScene;
	var cts = location.cameraTargets;
	lat = cts[-1].lat;
	lon = cts[-1].lon;
	lastPanoramaUID = location.uid;
	mapUid = location.mapUid;
	updateSceneSwitchButton();
	updateTargetList();
	initEventListener();
	setupDarkBlurShader();
	setupBrightBlurShader();
	isLoading = false;
	setMapandNavigationHidden(false);
}


function updateTargetList() {
	targetList = [];
	scene.traverse(function (object) {
		if (object instanceof Hotspot || object instanceof Transition) {
			targetList.push(object);
			object.lookAt(camera.position);
		}
	});
}


function transitToLocation(locationIndex, reset) {
	if (reset) {
		lastPanoramaUID = -1; 
	}
	if (locationIndex === lastPanoramaUID) {
		return;
	}
	isLoading = true;

	setMapandNavigationHidden(true);

	setTimeout(function () {    
		var loader = new LocationLoader();
		loader.loadLocation(locationIndex, function (location) {
			var panoScene = new THREE.Scene();
			panoScene.add(location);
			scene = panoScene;
			var cts = location.cameraTargets;
			if (cts[lastPanoramaUID]) {
				lat = cts[lastPanoramaUID].lat;
				lon = cts[lastPanoramaUID].lon;
			} else if (cts[-1]) {
				lat = cts[-1].lat;
				lon = cts[-1].lon;
			} else {
				lat = 2;
				lon = -103;
			}
			lastPanoramaUID = location.uid;
			mapUid = location.mapUid;
			updateSceneSwitchButton();
			updateTargetList();
			setupDarkBlurShader();
			setupBrightBlurShader();
			isLoading = false;
			setMapandNavigationHidden(false);
			camera.fov = 60;
			camera.updateProjectionMatrix();
		});
	}, 50);
}


function initEventListener() {
	var container = _('panorama');
	THREEx.FullScreen.bindKey({charCode: 'f'.charCodeAt(0), element: _('panorama')});

	container.addEventListener('mousedown', onMouseDown, false);
	container.addEventListener('mousemove', onMouseMove, false);
	container.addEventListener('mouseup', onMouseUp, false);
	container.addEventListener('mousewheel', onMouseWheel, false);
	container.addEventListener('DOMMouseScroll', onMouseWheel, false);

	container.addEventListener('touchstart', onDocumentTouchStart, false);
	container.addEventListener('touchmove', onDocumentTouchMove, false);
	container.addEventListener('touchend', onDocumentTouchEnd, false);


	container.addEventListener('dragover', function (event) {
		event.preventDefault();
		event.dataTransfer.dropEffect = 'copy';
	}, false);
	container.addEventListener('dragenter', function (event) {
		document.body.style.opacity = 0.5;
	}, false);
	container.addEventListener('dragleave', function (event) {
		document.body.style.opacity = 1;
	}, false);
	container.addEventListener('drop', function (event) {
		event.preventDefault();
		var reader = new FileReader();
		reader.addEventListener('load', function (event) {
			material.map.image.src = event.target.result;
			material.map.needsUpdate = true;

		}, false);
		reader.readAsDataURL(event.dataTransfer.files[0]);
		document.body.style.opacity = 1;
	}, false);
	document.addEventListener('keydown', onKeyDown, false);
	document.addEventListener('keyup', onKeyUp, false);

	window.addEventListener('resize', onWindowResize, false);

	_('infoCloseButton').addEventListener('click', function (event) {
		var div = _("infoView");
		div.style.display = "none";
		isPopupOpen = false;
		setMapandNavigationHidden(false);
	}, false);
   _('infoCloseButton').addEventListener('touched', function (event) {
		var div = _("infoView");
    	div.style.display = "none";
		isPopupOpen = false;
		setMapandNavigationHidden(false);
	}, false);
	var map = _(map);
	if (map) {
		_('map').addEventListener('dragstart', function (event) {
			event.preventDefault();
		});
	}

	var navGroup = _('navigationButtonsContainer');
	if (navGroup) {
		_('upNavButton').addEventListener('mousedown', function (event) {
			isUserInteracting = true;
			latFactor = 0.5;
		}, false);
		_('downNavButton').addEventListener('mousedown', function (event) {
			isUserInteracting = true;
			latFactor = -0.5;
		}, false);
		_('leftNavButton').addEventListener('mousedown', function (event) {
			isUserInteracting = true;
			lonFactor = -0.5;
		}, false);
		_('rightNavButton').addEventListener('mousedown', function (event) {
			isUserInteracting = true;
			lonFactor = 0.5;
		}, false);
		_('zoomInButton').addEventListener('mousedown', function (event) {
			zoom(-2)
		}, false);
		_('zoomOutButton').addEventListener('mousedown', function (event) {
			zoom(2)
		}, false);
		_('navigationButtonsContainer').addEventListener('mouseup', onMouseUp, false);

		_('upNavButton').addEventListener('touchstart', function (event) {
			isUserInteracting = true;
			latFactor = 0.5;
		}, false);
		_('downNavButton').addEventListener('touchstart', function (event) {
			isUserInteracting = true;
			latFactor = -0.5;
		}, false);
		_('leftNavButton').addEventListener('touchstart', function (event) {
			isUserInteracting = true;
			lonFactor = -0.5;
		}, false);
		_('rightNavButton').addEventListener('touchstart', function (event) {
			isUserInteracting = true;
			lonFactor = 0.5;
		}, false);
		_('zoomInButton').addEventListener('touchstart', function (event) {
			zoom(-2)
		}, false);
		_('zoomOutButton').addEventListener('touchstart', function (event) {
			zoom(2)
		}, false);
		_('navigationButtonsContainer').addEventListener('touchend', onMouseUp, false);
	}

	var sceneSwitch = _('sceneSwitch')
	if (sceneSwitch) {
		_('sceneSwitch').addEventListener('mousedown', switchScene);
		_('sceneSwitch').addEventListener('touchstart', switchScene);
	}

	var fullscreen = _('fullscreen');
	if (fullscreen) {
		_('fullscreen').addEventListener('mousedown', toggleFullScreen);
		_('fullscreen').addEventListener('touchstart', toggleFullScreen);
	}
}

function toggleFullScreen(event) {
	if (THREEx.FullScreen.activated()) {
		THREEx.FullScreen.cancel();
	} else {
		THREEx.FullScreen.request(_('panorama'));
	}
}


function switchScene(event) {
	if (mapUid === 1) {
		transitToLocation(98, true);
	} else {
		transitToLocation(12, true);
	}
}


function updateSceneSwitchButton() {
	var button = _('sceneSwitch');
	if (button) {
		if (mapUid === 1) {
			button.textContent = 'Switch Scene';
		} else {
			button.textContent = 'Switch Scene';
		}
	}
}


function setMapandNavigationHidden(hidden) {
	var map = _('map');
	var navButtons = _('navigationButtonsContainer');
	var about = _('about');
	var sceneSwitch = _('sceneSwitch');
	if (hidden) {
		if (map) map.style.display = 'none';
		if (navButtons) navButtons.style.display = 'none';
		if (about) about.style.display = 'none';
		if (sceneSwitch) sceneSwitch.style.display = 'none';
	} else {
		if (map) map.style.display = 'block';
		if (navButtons) navButtons.style.display = 'block';
		if (about) about.style.display = 'block';
		if (sceneSwitch) sceneSwitch.style.display = 'block';
	}

}

function onWindowResize(event) {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
}


function onMouseDown(event) {
	var eventX = event.pageX;
	var eventY = event.pageY;
	downEventHandler(eventX, eventY, event);
}


function onMouseMove(event) {
	var eventX = event.pageX;
	var eventY = event.pageY;
	moveEventHandler(eventX, eventY, event);
}


function onMouseUp(event) {
	upEventHandler(event);
}


function onMouseWheel(event) {
	wheelEventHandler(event.pageX, event.pageY, event);
}


function onDocumentTouchStart(event) {
	if (event.touches.length === 1) {
		var touchX = event.touches[0].pageX;
		var touchY = event.touches[0].pageY;
		downEventHandler(touchX, touchY, event);
	} else if (event.touches.length === 2) {
	}
}


function onDocumentTouchMove(event) {
	if (event.touches.length === 1) {
		var touchX = event.touches[0].pageX;
		var touchY = event.touches[0].pageY;
		moveEventHandler(touchX, touchY, event);
	}
}


function onDocumentTouchEnd(event) {
	upEventHandler(event);
}

function moveEventHandler(eventX, eventY, event) {
	// Position of toolTips
	toolTip.style.left = eventX + 20 + "px";
	toolTip.style.top = eventY + 20 + "px";

	if (isPopupOpen) {
		return;
	}

	mouse.x = ( eventX / window.innerWidth ) * 2 - 1;
	mouse.y = -( eventY / window.innerHeight ) * 2 + 1;

	if (isUserInteracting === true) {
		lonFactor = mouse.x;
		latFactor = mouse.y;
	} else {
		var vector = new THREE.Vector3(mouse.x, mouse.y, 0);
		projector.unprojectVector(vector, camera);
		var ray = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());

		var intersects = ray.intersectObjects(targetList);

		if (intersects.length > 0) {
			if (intersects[0].object != hoverIntersected) {
				if (hoverIntersected) {
					hoverIntersected.material.color.setHex(hoverIntersected.currentHex);
				}
				hoverIntersected = intersects[0].object;
				hoverIntersected.currentHex = hoverIntersected.material.color.getHex();

				hoverIntersected.material.color.setHex(0x917d4d);

				if (intersects[0].object.tooltip) {
					toolTip.innerHTML = intersects[0].object.tooltip;
					toolTip.style.display = "block";
				} else {
					toolTip.innerHTML = "";
					toolTip.style.display = "none";
				}

			}
		} else {
			if (hoverIntersected) {
				hoverIntersected.material.color.setHex(hoverIntersected.currentHex);
			}
			hoverIntersected = null;
			toolTip.style.display = "none";
		}
	}
}


function downEventHandler(eventX, eventY, event) {
	if (isPopupOpen) {
		return;
	}
	event.preventDefault();

	mouse.x = ( eventX / window.innerWidth ) * 2 - 1;
	mouse.y = -( eventY / window.innerHeight ) * 2 + 1;
	var vector = new THREE.Vector3(mouse.x, mouse.y, 0);
	projector.unprojectVector(vector, camera);
	var ray = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());

	var intersects = ray.intersectObjects(targetList);

	if (intersects.length > 0) {
		intersects[0].object.onClick();
		if (intersects[0].object instanceof Hotspot) {
			isPopupOpen = true;
		}
	} else {
		lonFactor = mouse.x;
		latFactor = mouse.y;
		isUserInteracting = true;
	}
	toolTip.style.display = "none";
}

function upEventHandler(event) {
	lonFactor = 0;
	latFactor = 0;
	isUserInteracting = false;
}

function wheelEventHandler(eventX, eventY, event) {
	event.preventDefault();
	if (isPopupOpen) {
		return;
	}

	if (event.wheelDeltaY) {
		camera.fov -= event.wheelDeltaY * 0.05;

	} else if (event.wheelDelta) {
		camera.fov -= event.wheelDelta * 0.05;

	} else if (event.detail) {
		camera.fov += event.detail * 1.0;
	}

	if (camera.fov > 60) {
		camera.fov = 60;
	} else if (camera.fov < 40) {
		camera.fov = 40;
	}
	camera.updateProjectionMatrix();
}

function zoom(amount) {
	camera.fov += amount;
	if (camera.fov > 60) {
		camera.fov = 60;
	} else if (camera.fov < 40) {
		camera.fov = 40;
	}
	camera.updateProjectionMatrix();
}


function onKeyDown(event) {
	isUserInteracting = true;
	if (event.keyCode === 37) {
		lonFactor = -0.5;
	} else if (event.keyCode === 38) {
		latFactor = 0.5;
	} else if (event.keyCode === 39) {
		lonFactor = 0.5
	} else if (event.keyCode === 40) {
		latFactor = -0.5;
	}
}

function onKeyUp(event) {
	lonFactor = 0;
	latFactor = 0;
	isUserInteracting = false;
}


function updateCursor(elem, cursorStyle) {
	elem.style.cursor = cursorStyle;
}

function showAbout(event) {
	var aboutBox = document.getElementById('aboutView');
	aboutBox.style.display = "block";
	isPopupOpen = true;
}

function animate() {
	requestAnimationFrame(animate);
	update();
}

function update() {
	if (!scene) {
		return;
	}
	if (!isUserInteracting && !timerId) {
		timerId = setTimeout(resetPanorama, 2 * 60 * 1000);
	} else if (isUserInteracting && timerId) {
		clearTimeout(timerId);
		timerId = null;
	}

	if (isLoading) {
		if (transitionComposer) {
			transitionComposer.render();
		}
		return;
	}
	if (!isPopupOpen) {
		lon = (lon + lonFactor) % 360;
		lat = lat + latFactor;

		lat = Math.max(-35, Math.min(45, lat));
		phi = THREE.Math.degToRad(90 - lat);
		theta = THREE.Math.degToRad(lon);
		camera.target.x = 195 * Math.sin(phi) * Math.cos(theta);
		camera.target.y = 195 * Math.cos(phi);
		camera.target.z = 195 * Math.sin(phi) * Math.sin(theta);
		camera.lookAt(camera.target);
		renderer.render(scene, camera);
	} else {
		setMapandNavigationHidden(true);
		composer.render();
	}
}

function resetPanorama() {
	lastPanoramaUID = -1;
	transitToLocation(panoramaData.startLocation, true);
}

function setupDarkBlurShader() {
	composer = new THREE.EffectComposer(renderer);
	var renderPass = new THREE.RenderPass(scene, camera);
	composer.addPass(renderPass);

	var blurShader = new THREE.ShaderPass(THREE.BlurShader);
	blurShader.uniforms["h"].value = 1.0 / window.innerWidth;
	blurShader.uniforms["v"].value = 1.0 / window.innerHeight;
	blurShader.uniforms["strength"].value = 0.2;
	blurShader.renderToScreen = true;

	composer.addPass(blurShader);
}

function setupBrightBlurShader() {
	transitionComposer = new THREE.EffectComposer(renderer);
	var renderPass = new THREE.RenderPass(scene, camera);
	transitionComposer.addPass(renderPass);

	var blurShader = new THREE.ShaderPass(THREE.BlurShader);
	blurShader.uniforms["h"].value = 1.0 / window.innerWidth;
	blurShader.uniforms["v"].value = 1.0 / window.innerHeight;
	blurShader.uniforms["strength"].value = 0.5;
	blurShader.renderToScreen = true;

	transitionComposer.addPass(blurShader);
}

function _(id) {
	return document.getElementById(id);
}

function vectorToString(v) {
	return "[ " + v.x + ", " + v.y + ", " + v.z + " ]";
}




