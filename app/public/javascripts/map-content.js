
L.MapContent = L.Evented.extend({

    options : {
        flyTo : false,
    },

    initialize : function (options) {

        // set options
        L.setOptions(this, options);

        // set container
        this._container = options.container;

        // create map
        this._createMap();

        // set events
        this.listen();

        // debug
        window.debug = window.debug || {};
        window.debug.map = this._map;
    },

    listen : function () {
        this.on('reverse-lookup', this._onReverseLookup);
    },

    _createAddButton : function () {

        // create button
        this._addButton = L.DomUtil.create('div', 'add-button red-button', this._container);
        this._shadowButton = L.DomUtil.create('div', 'shadow-button white-button', this._container);
        this._shadowButton.innerHTML = app.locale.ok;

        // add event
        L.DomEvent.on(this._addButton, 'click', this.addNote, this);

    },

    addNote : function () {

        // 1. hide other markers
        this._hideMarkers();

        // add position marker
        this._addPositionMarker();

    },

    _showAddButton : function () {
        if (!this._addButton) this._createAddButton();

        this._centerHelp && L.DomUtil.remove(this._centerHelp);

        // show (+) button
        L.DomUtil.removeClass(this._addButton, 'center-of-map');
        L.DomUtil.removeClass(this._shadowButton, 'color-white');
        L.DomUtil.addClass(this._shadowButton, 'white-button');
        L.DomUtil.addClass(this._addButton, 'red-button');

        // event
        L.DomEvent.off(this._shadowButton, 'click', this._openNotesCreator, this);
       
    },

    _centerAddButton : function () {
        if (!this._addButton) this._createAddButton();

        this._centerHelp = L.DomUtil.create('div', 'center-help', this._container);
        this._centerHelp.innerHTML = app.locale.addNoteHelp;

        // move marker to center
        L.DomUtil.addClass(this._addButton, 'center-of-map');
        L.DomUtil.addClass(this._shadowButton, 'color-white');
        L.DomUtil.removeClass(this._shadowButton, 'white-button');
        L.DomUtil.removeClass(this._addButton, 'red-button');

        // event: cancel
        L.DomEvent.on(this._shadowButton, 'click', this._openNotesCreator, this);

        // remove popup if any
        this._popup && this._popup.remove();

    },

    _addPositionMarker : function () {
        this._centerAddButton();
    },

    _removePositionMarker : function () {
        this._showAddButton();
        this._showMarkers();
    },

    _hideMarkers : function () {
        _.each(this._layers, function (l) {
            map.setLayoutProperty(l.id, 'visibility', 'none');
        });
    },
    _showMarkers : function () {
        _.each(this._layers, function (l) {
            map.setLayoutProperty(l.id, 'visibility', 'visible');
        });
    },

    _getAddress : function () {

        // get position of marker
        var center = this._map.getCenter();

        // reverse lookup for address
        app.api.geocodeReverse({ 
            lat: center.lat, 
            lng: center.lng
        }, function(err, res) {
            if (err) console.error(err);

            var results = safeParse(res);

            var features = results ? results.features : [];
            if (!_.size(features)) return console.error('no result');

            // get address
            var address = features[0] ? features[0].place_name : '';

            // fire event
            this.fire('reverse-lookup', {
                address : address,
                features : features
            });

        }.bind(this));

    },

    _onReverseLookup : function (options) {

        // save
        this.note.address = options.address;

        // get div
        var div = this._reverseLookupAddressDiv;
        if (!div) {
            setTimeout(function () {
                var div = this._reverseLookupAddressDiv;
                if (div) div.value = this.note.address;
            }.bind(this), 1000);
        } else {

            // set address
            div.value = this.note.address;
        }
    },

    note : {},

    _openNotesCreator : function (center) {

        var map = this._map;

        // remove position markers
        this._removePositionMarker();

        // reverse lookup address
        this._getAddress();

        // get position of marker
        this.note.center = map.getCenter();

        // get zoom
        this.note.zoom = map.getZoom();

        // container
        this.note.container = L.DomUtil.create('div', 'write-note-container', app._container);

        // content
        var container = this._writeNoteContent = L.DomUtil.create('div', 'write-note-content', this.note.container);

        // title
        var title = L.DomUtil.create('div', 'write-note-title', container);
        title.innerHTML = app.locale.notes.noteTitle;

         // cancel button
        var cancelBtn = L.DomUtil.create('div', 'write-note-cancel-button close', container);
        L.DomEvent.on(cancelBtn, 'click', this._cancelNote, this);

        // address
        var addressContainer = L.DomUtil.create('div', 'write-note-address-container', container);
        addressContainer.innerHTML = '<i class="fa fa-map-marker big" aria-hidden="true"></i>';
        var addressInput = this._reverseLookupAddressDiv = L.DomUtil.create('input', 'write-note-address-text', addressContainer);
        addressInput.setAttribute('type', 'text');

        // photo button (only if supported)
        if (this.uploadSupported()) {

            // button
            var photoBtn = L.DomUtil.create('input', 'photo-upload-preview', container);
            photoBtn.setAttribute('id', 'file');
            photoBtn.setAttribute('type', 'file');
            photoBtn.setAttribute('name', 'file');
            photoBtn.setAttribute('accept', 'image/*');
            L.DomEvent.on(photoBtn, 'change', this._onPhotoBtnChange, this);

            // image container
            var imgContainer = L.DomUtil.create('div', 'preview-image-container', container);
            var shadowImg = this.note.imageContainer = L.DomUtil.create('img', 'photo-upload-preview-shadow-img', imgContainer);

            // add to global
            this.note.uploader = photoBtn;

            // add progress bar
            var progressBar = this.note.progressBar = L.DomUtil.create('div', 'progress-bar', container);

            // add help text
            var helpText = this.note.helpText = L.DomUtil.create('div', 'upload-help-text', container);
            helpText.innerHTML = app.locale.uploadHelpText;
        }

        // text input
        var textBox1 = this.note.textboxTitle = L.DomUtil.create('input', 'write-note-text', container);
        textBox1.setAttribute('placeholder', app.locale.title);
        textBox1.setAttribute('type', 'text');

        // text input
        var textBox = this.note.textboxText = L.DomUtil.create('input', 'write-note-text', container);
        textBox.setAttribute('placeholder', app.locale.writeYourSuggestion);
        textBox.setAttribute('type', 'text');

         // text input
        var nameBox = this.note.nameText = L.DomUtil.create('input', 'write-note-text', container);
        nameBox.setAttribute('placeholder', app.locale.yourName);
        nameBox.setAttribute('type', 'text');
       
        // ok button
        var okBtn = L.DomUtil.create('div', 'write-note-ok-button', container);
        okBtn.innerHTML = app.locale.notes.send;
        L.DomEvent.on(okBtn, 'click', this._sendNote, this);

    },

    uploadSupported : function () {
        return window.File && window.FileReader && window.FormData;
    },

    _onPhotoBtnChange : function (e) {
        var file = e.target.files[0];
        var note = this.note;
        var uploader = this._uploadFile.bind(this)
        var help = this.note.helpText;
        
        if (file) {
            
            // only allow image uploads
            if (/^image\//i.test(file.type)) {
                
                var _URL = window.URL || window.webkitURL;
                var file, img;
                img = new Image();
                img.onload = function (e) {
                    
                    // set image
                    note.imageContainer.setAttribute('src', _URL.createObjectURL(file));

                    // set width
                    var w = this.width;
                    var h = this.height;
                    note.imageContainer.style.height = (h <= w) ? '100%' : 'auto';
                    note.imageContainer.style.width = (w < h) ? '100%' : 'auto';

                    // hide help text
                    help.style.zIndex = 9;

                    // start upload
                    uploader(file);
                };

                // dummy
                img.src = _URL.createObjectURL(file);

                L.DomUtil.addClass(note.imageContainer, 'fit-image');

            } else {
                alert(app.locale.notes.invalidImage);
            }
        }
    },

    _uploadFile : function (file) {

        // mark uploading
        this._uploading = true;

        // upload
        app.api.upload(file, function (err, results) {
            if (err) {
                console.error(err);
                this._uploading = false;
                return;
            }

            // parse
            var res = safeParse(results);
            
            // save image
            this.note.image = res.image;

            // done uploading
            this._uploading = false;

        }.bind(this), 

        // progress bar
        function (progress) {
            if (progress > 98) {
                this.note.progressBar.style.width = 0;
                return;
            }

            this.note.progressBar.style.width = progress + '%';

        }.bind(this));
    },

    _u : 0,

    _missingField : function (field) {
        field.style.border = '1px solid red';
        field.setAttribute('placeholder', app.locale.pleaseFillIn);
    },

    _sendNote : function () {

        // get values
        var text = this.note.textboxText.value;
        var title = this.note.textboxTitle.value;
        var center = this.note.center;
        var address = this.note.address;
        var zoom = this.note.zoom;
        var username = this.note.nameText.value || app.locale.notes.anon;
        var tags = ["mittlier"]; // todo: 
        var portal_tag = 'mittlier'; // todo: from config
        var image = this.note.image;

        // check values
        if (!text) return this._missingField(this.note.textboxText);
        if (!title) return this._missingField(this.note.textboxTitle);

        // wait for upload to finish
        if (this._uploading) {

            // set counter
            this._u += 1;

            // re-run
            return setTimeout(function () {
                this._sendNote();
            }.bind(this), 500);
        }

        // reset counter
        this._u = 0;

        var user_id = this._getUserId();

        // create geojson feature
        var feature = {
            "type": "Feature",
            "properties": {
                title : title,
                text : text,
                address : address,
                username : username,
                user_id : user_id,
                tags : tags,
                image : image,
                zoom : zoom,
                portal_tag : portal_tag,
                timestamp : Date.now(),
                id : Math.random().toString(36).substr(2, 6),
            },
            "geometry": {
                "type": "Point",
                "coordinates": [
                    center.lng,
                    center.lat
                ]
            }
        }

        // prepare POST data
        var data = {
            feature: feature
        }

        // send note to server
        app.api.note(data, function (err, result) {
            if (err) console.error(err);

            this._createdFeature = safeParse(result);

            // note sent ok
            this._onNoteSent(err);

        }.bind(this));

    },

    _getUserId : function () {
        var user_id = Cookies.get('user_id');
        if (!user_id) {
            var user_id = Math.random().toString(36).substring(5);
            Cookies.set('user_id', user_id);
        }
        return user_id;
    },

    _onNoteSent : function (err) {

        // close note window
        L.DomUtil.remove(this.note.container);
       
        // update data
        var data_url = window.location.origin + '/v1/notes';
        this._map.getSource('earthquakes').setData(data_url);

        // show markers
        this._showMarkers();

        // show add button
        this._showAddButton();

        // clear
        this.note = {};

        // show new note
        var c = this._createdFeature.feature.geometry.coordinates;
        var lngLat = new mapboxgl.LngLat(c[0], c[1]);
        var mapCenter = this._map.getCenter();
        var map = this._map;
        setTimeout(function () {
            map.fire('click', { lngLat: lngLat , e : {}})
        }, 1000);

        // set cookie, works!
        // Cookies.set('my-notes', '["id-1", "id-2"]');
        // var cookie = Cookies.get('my-notes');
        // console.log('this._createdFeature', this._createdFeature);
        // alert(cookie);
    },

    _cancelNote : function () {
        // close note window
        L.DomUtil.remove(this.note.container);
    
        // show markers
        this._showMarkers();

        // show add button
        this._showAddButton();

        // clear
        this.note = {};
    },

    _createMap : function () {

        // get map container
        this._content = L.DomUtil.get('map');

        this._styles = {
            satellite : 'mapbox://styles/mapic/cj3lgc596000p2sp0ma8z1km0',
            streets : 'mapbox://styles/mapbox/streets-v9',
        }

        var mapOptions = {
            container: 'map',
            // style: 'mapbox://styles/mapbox/streets-v9',
            // style: 'mapbox://styles/mapbox/satellite-v9',
            // style: 'mapbox://styles/mapic/cj3lgc596000p2sp0ma8z1km0',
            style: this._styles.satellite,
            center: [10.24333427476904, 59.78323674962704],
            zoom : 12,
            attributionControl : false,
        };

        // initialize mapboxgl
        mapboxgl.accessToken = 'pk.eyJ1IjoibWFwaWMiLCJhIjoiY2ozbW53bjk5MDAwYjMzcHRiemFwNmhyaiJ9.R6p5sEuc0oSTjkcKxOSX1w';
        var map = this._map = new mapboxgl.Map(mapOptions);

        // map ready event
        map.on('load', this._onMapLoad.bind(this));

        // create (+) button
        this._showAddButton();

        // create background layer toggle control
        this._createToggleControl();
    },

    _createToggleControl : function () {

        var div = L.DomUtil.create('div', 'background-toggle-control', this._container);
        div.innerHTML = '<i class="fa fa-map" aria-hidden="true"></i>';
        L.DomEvent.on(div, 'click', this._toggleBackground, this);
    },

    _toggled : false,

    _toggleBackground : function () {
        var map = this._map;
        this._toggled = !this._toggled;
        if (this._toggled) {
            map.setLayoutProperty('norkart', 'visibility', 'none');
            map.setLayoutProperty('mapbox', 'visibility', 'visible');
        } else {
            map.setLayoutProperty('norkart', 'visibility', 'visible');
            map.setLayoutProperty('mapbox', 'visibility', 'none');
        }
    },

    _onMapLoad : function () {
       
        // shortcut
        var map = this._map;

        // mapbox streets raster tiles
        map.addSource('mapbox-tiles', {
            "type": "raster",
            "tiles": ['https://api.mapbox.com/styles/v1/mapbox/outdoors-v10/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWFwaWMiLCJhIjoiY2l2MmE1ZW4wMDAwZTJvcnhtZGI4YXdlcyJ9.rD_-Ou1OdKQsHqEqL6FJLg'],
            "tileSize": 256
        });

        map.addLayer({
            "id": "mapbox",
            "type": "raster",
            "source": "mapbox-tiles",
            "minzoom": 0,
            "maxzoom": 22,
            "source-layer" : "background"
        });
        // hide by default
        map.setLayoutProperty('mapbox', 'visibility', 'none');

        // norkart raster tiles
        map.addSource('norkart-tiles', {
            "type": "raster",
            "tiles": ['https://www.webatlas.no/maptiles/tiles/webatlas-orto-newup/wa_grid/{z}/{x}/{y}.jpeg'],
            "tileSize": 256
        });

        map.addLayer({
            "id": "norkart",
            "type": "raster",
            "source": "norkart-tiles",
            "minzoom": 0,
            "maxzoom": 22
        });

        // move order
        map.moveLayer('norkart', 'background');

        // load custom marker
        map.loadImage(window.location.origin + '/stylesheets/blomst-red.png', function (err, image) {
            if (err) console.log(err);

            // add image
            map.addImage('blomst', image);

            map.loadImage(window.location.origin + '/stylesheets/blomst-yellow.png', function (err, image2) {


                // add image
                map.addImage('blomst2', image2);

                // set data url
                var data_url = window.location.origin + '/v1/notes';

                map.addSource("earthquakes", {
                    type: "geojson",
                    data: data_url, 
                });

                console.log('data_url', data_url);

                // get user id
                var user_id = this._getUserId();

                // all points except own
                var notes_layer = {
                    id: "notes",
                    type: "symbol",
                    source: "earthquakes",
                    filter: ["!=", "user_id", user_id],
                    layout : {
                        "icon-image": "blomst",
                        "icon-size" : 0.4,
                        "icon-allow-overlap" : true
                    }
                }

                // add layers
                map.addLayer(notes_layer);

                 // own points
                var own_notes_layer = {
                    id: "own-notes",
                    type: "symbol",
                    source: "earthquakes",
                    filter: ["==", "user_id", user_id],
                    layout : {
                        "icon-image": "blomst2",
                        "icon-size" : 0.4,
                        "icon-allow-overlap" : true
                    }
                }

                // add layers
                map.addLayer(own_notes_layer);

                this._layers = {
                    notes_layer : notes_layer
                }

                // when map moves
                map.on('moveend', this._onMoveEnd.bind(this));

                // add popups
                this._addPopups();

                // debug
                window.map = map;

            }.bind(this));

        }.bind(this));


    },

    _onMoveEnd : function () {
    },

    _addPopups : function () {

        var map = this._map;

        // Create a popup, but don't add it to the map yet.
        var popup = new mapboxgl.Popup({
            closeButton: true,
            closeOnClick: false,
            anchor : 'bottom',
            offset : 10
        });

        var fly = function (e) {

            // stop mouse-events
            L.DomEvent.stop(e);


            // get feature id
            var f_id = this._createdFeature ? this._createdFeature.feature.properties.id : false;
           
            // feature
            var feature = f_id ? _.find(e.features, function (f) { return f.properties.id == f_id }) : e.features[0];

            map.flyTo({center: feature.geometry.coordinates});

        };

        // show popup fn
        var showPopup = function (e) {

            // stop mouse-events
            L.DomEvent.stop(e);

            // cursor
            map.getCanvas().style.cursor = 'pointer';

            // get feature id
            var f_id = this._createdFeature ? this._createdFeature.feature.properties.id : false;
           
            // feature
            var feature = f_id ? _.find(e.features, function (f) { return f.properties.id == f_id }) : e.features[0];

            // show popup
            popup.setLngLat(feature.geometry.coordinates)
            .setHTML(this._createPopupHTML(feature.properties))
            .addTo(map);

            // add "les mer" event
            var readMore = L.DomUtil.get('note-read-more');
            L.DomEvent.on(readMore, 'click', function () {
                this._readMore(feature);
            }, this);

            this._popup = popup;

            this._createdFeature = null;

        }.bind(this);

        var removePopup = function (e) {
            map.getCanvas().style.cursor = '';
            popup.remove();
        };

        map.on('mouseenter', 'notes', function (e) {
            map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'notes', function () {
            map.getCanvas().style.cursor = '';
        });
        map.on('mouseenter', 'own-notes', function (e) {
            map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'own-notes', function () {
            map.getCanvas().style.cursor = '';
        });

        // mouse: remove popup
        map.on('click', removePopup);

        // mouse: show popup (must be registered _after_ remove popup above)
        map.on('click', 'notes', showPopup);
        map.on('click', 'own-notes', showPopup);

        map.on('mouseup', 'notes', fly);
        map.on('mouseup', 'own-notes', fly);

        // touch: show popup
        map.on('touchstart', 'notes', showPopup);
        map.on('touchstart', 'own-notes', showPopup);

    },  


    _readMore : function (feature) {
        
        var map = this._map;
        var note = feature.properties;
        var image = safeParse(note.image);
        var image_url = image ? image.original : '';

        // container
        var main_container = this._readMoreContainer = L.DomUtil.create('div', 'write-note-container', app._container);

        // content
        var container = this._writeNoteContent = L.DomUtil.create('div', 'write-note-content', main_container);

        // title
        var title = L.DomUtil.create('div', 'write-note-title capitalize', container);
        title.innerHTML = note.title;

        // cancel button
        var cancelBtn = L.DomUtil.create('div', 'write-note-cancel-button close', container);
        L.DomEvent.on(cancelBtn, 'click', this._closeReadMore, this);

        // address
        var addressContainer = L.DomUtil.create('div', 'write-note-address-container', container);
        addressContainer.innerHTML = '<i class="fa fa-map-marker big" aria-hidden="true"></i>';
        var addressInput = L.DomUtil.create('div', 'write-note-address-text-div', addressContainer);
        addressInput.innerHTML = note.address;

        // image
        var imgContainer = L.DomUtil.create('div', 'preview-image-container read-more', container);
        if (image && image.original) {

            var shadowImg = L.DomUtil.create('img', 'photo-upload-preview-shadow-img-div fit-image', imgContainer);
            shadowImg.setAttribute('src', image_url);

            var w = image.width;
            var h = image.height;

            // set width
            shadowImg.style.height = (h <= w) ? '100%' : 'auto';
            shadowImg.style.width = (w < h) ? '100%' : 'auto';

        } else {
            L.DomUtil.addClass(imgContainer, 'empty-preview');
        }

        // user
        var userBox = L.DomUtil.create('div', 'write-note-user-div', container);
        userBox.innerHTML = '<i class="fa fa-user-circle" aria-hidden="true"></i>' + note.username;

        // time
        var timeBox = L.DomUtil.create('div', 'write-note-user-div', container);
        var d = new Date(note.timestamp);
        timeBox.innerHTML = '<i class="fa fa-calendar" aria-hidden="true"></i>' + d.getDate() + '.' + d.getMonth() + '.' + d.getFullYear();
 
        // text 
        var textBox = L.DomUtil.create('div', 'write-note-text-div min-height-100', container);
        textBox.innerHTML = note.text;

        // like button
        var like_container = L.DomUtil.create('div', 'like-container', container);
        var likeBtn  = '<div class="fb-like" ';
        likeBtn     += 'data-href="';
        likeBtn     += window.location.origin + '/v1/direct/' + note.id;
        likeBtn     += '" data-layout="standard" data-width="300px" data-action="like" data-share="true" data-size="large" data-show-faces="true"></div>'
        like_container.innerHTML = likeBtn;
        FB.XFBML.parse(like_container);

        // close button
        var okBtn = L.DomUtil.create('div', 'write-note-ok-button bottom-10', container);
        okBtn.innerHTML = app.locale.close;
        L.DomEvent.on(okBtn, 'click', this._closeReadMore, this);

        // check if own note
        var user_id = this._getUserId();
        if (note.user_id == user_id) {
            console.log('my note!');

            var editBtn = L.DomUtil.create('div', 'edit-own-note-btn', container);
            editBtn.innerHTML = app.locale.edit;

            L.DomEvent.on(editBtn, 'click', this._editOwnNote, this);
        }

    },

    _editOwnNote : function () {
        console.log('edit own note');
    },

    _closeReadMore : function () {
        L.DomUtil.remove(this._readMoreContainer);
    },

    _createPopupHTML : function (p) {

        // get tags
        var tags = safeParse(p.tags);
        var niceTags = app.locale.notes.keywords + ': ';
        _.each(tags, function (t) {
            var v = _.upperCase(t) + ' ';
            niceTags += v 
        });

        var p_image = safeParse(p.image);

        // get name
        var name = app.locale.notes.writtenBy + ': ' + _.capitalize(p.username);

        // get image
        var image = (p_image && p_image.original) ? p_image.original : false;

        // create html
        var html = '<div class="notes-popup">';
        
        // image
        var notesImgClass = image ? 'notes-image background-red' : 'notes-image';
        html    += '    <div class="' + notesImgClass + '">'
        if (image) {
        html    += '        <img src="' + image + '">'
        } 
        html    += '    </div>'

        // right wrapper
        html    += '    <div class="notes-right-wrapper">'

            // title
            html    += '    <div class="notes-title">'
            html    +=          p.title
            html    += '    </div>'

            // address
            html    += '    <div class="notes-address">';
            html    += '        <i class="fa fa-map-marker" aria-hidden="true"></i>' + p.address;
            html    += '    </div>'

            // text
            html    += '    <div class="notes-text">'
            html    +=          p.text
            html    += '    </div>'
           
            // les mer...
            html    += '    <div id="note-read-more" class="notes-read-more">'
            html    += '    Les mer...'
            html    += '    </div>'

        html    += '    </div>'
    
        html    += '</div>'
        return html;
    },

    resize : function () {
        this._map.resize();
    },

});
