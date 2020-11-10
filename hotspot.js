
Hotspot = function (parameters) {

	if (parameters === undefined) parameters = {};
	this.infoContent = parameters.hasOwnProperty('content') ? parameters['content'] : "No content";
	this.infoTitle = parameters.hasOwnProperty('title') ? parameters['title'] : "";
	this.infoImages = parameters.hasOwnProperty('images') ? parameters['images'] : null;
	this.tooltip = parameters.hasOwnProperty('tooltip') ? parameters['tooltip'] : null;
	var geometry = new THREE.PlaneGeometry(16, 16);
	var material = new THREE.MeshBasicMaterial({
		map: THREE.ImageUtils.loadTexture("resources/icons/information.png"),
		transparent: true
	});
	THREE.Mesh.call(this, geometry, material);
	this.position.set(parameters.position.x, parameters.position.y, parameters.position.z);
};

Hotspot.prototype = Object.create(THREE.Mesh.prototype);
Hotspot.prototype.onClick = function (event) {
	var infoView = _('infoView');
	var infoTitle = _('infoTitle');
	infoTitle.innerHTML = this.infoTitle;
	var infoContent = _('infoContent');
	infoContent.innerHTML = this.infoContent;
	if (this.infoImages && this.infoImages.length == 1) {
		var infoImageBox = _('infoImageBox');
		var infoImage = _('infoImage');
		infoImage.src = this.infoImages[0].figure;
		var infoCaption = _('infoCaption');
		infoCaption.textContent = this.infoImages[0].caption;
		infoImageBox.style.display = 'block';
	} else {
		var infoImageBox = _('infoImageBox');
		infoImageBox.style.display = 'none';
	}
	infoView.style.display = "block";
};


