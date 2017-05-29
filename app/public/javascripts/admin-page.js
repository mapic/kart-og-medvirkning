// main app
L.Admin = L.Class.extend({

    _buttons : {
        info : {},
        map : {},
        media : {}
    },

    _content : {},

    initialize : function (options) {

        // shortcut
        window.app = this;

        // set options
        L.setOptions(this, options);
   
        // create api
        this.api = new L.Api();
   
        // google analytics
        app.ga();

        // login first
        this._initLogin();
    },

    ga : function (event) {
        ga('create', this.options.ga, 'auto');
        ga('send', event || 'pageview');
    },

    _initLogin : function () {

        // set events on login button
        var loginForm = L.DomUtil.get('login-form');
        L.DomEvent.on(loginForm, 'submit', this._logIn, this);
    },

    _logIn : function (e) {

        // stop default form action
        L.DomEvent.stop(e);

        // get values
        var email = L.DomUtil.get('login-username').value;
        var password = L.DomUtil.get('login-password').value;

        // send to server, check if valid
        this.post('login', {
            email : email, 
            password : password
        }, function (err, response) {

            // catch errors, invalid logins
            if (err) return this._failedLogin(err);
            var res = JSON.parse(response);
            if (res.error) return this._failedLogin(res.error);
            if (!res.access_token) return this._failedLogin('Something went wrong. Please try again.')

            // login ok
            app.access_token = res.access_token;

            // continue
            this._loggedIn();

        }.bind(this));
    },

    _failedLogin : function (msg) {
        // clear form
        L.DomUtil.get('login-username').value = '';
        L.DomUtil.get('login-password').value = '';

        // send analytics: todo: fix event name
        app.ga('login.failed')

        // alert
        alert(msg);
    },

    _loggedIn : function () {

        // hide login
        var loginContainer = L.DomUtil.get('login-container');
        loginContainer.style.display = 'none';

        // get browser
        this._detectDevice();

        // set locale
        this.locale = window.locale[this.options.locale || 'NO'];

        // get html
        this._initContent();

        // set events
        this._setEvents();

        // fill content
        this._fillContent();

        // set default pane
        this._show('map');

    },

    _initContent : function () {

        // get container
        this._container = L.DomUtil.get('app-container');
        this._container.style.display = 'block';
        
        // get content
        this._content.info = L.DomUtil.get('content-info');
        this._content.map = L.DomUtil.get('content-kart');
        this._content.media = L.DomUtil.get('content-media');

        // get buttons
        this._buttons.info.div  = L.DomUtil.get('button-info');
        this._buttons.map.div  = L.DomUtil.get('button-kart');
        this._buttons.media.div = L.DomUtil.get('button-media');

        // set button text
        this._buttons.info.div.innerHTML = this.locale.buttons.info;
        this._buttons.map.div.innerHTML = this.locale.buttons.map;
        this._buttons.media.div.innerHTML = this.locale.buttons.media;

        // set logo
        if (this.isDesktop()) {
            this._logo = L.DomUtil.get('site-logo-admin');
            this._logo.style.display = 'block';
        }
    },

    _setEvents : function () {

        // create hammer elements
        var hammerOptions = {};
        this._buttons.info.event = new Hammer(this._buttons.info.div, hammerOptions);
        this._buttons.map.event = new Hammer(this._buttons.map.div, hammerOptions);
        this._buttons.media.event = new Hammer(this._buttons.media.div, hammerOptions);
        
        // set events
        this._buttons.info.event.on('tap', this._showInfo.bind(this));
        this._buttons.map.event.on('tap', this._showMap.bind(this));
        this._buttons.media.event.on('tap', this._showMedia.bind(this));
    },

    _detectDevice : function  () {
        // see https://hgoebl.github.io/mobile-detect.js/doc/MobileDetect.html
        this._md = new MobileDetect(window.navigator.userAgent);
    },

    isJustMobile : function () {
        return this._md.mobile() && !this._md.tablet();
    },

    isMobile : function () {
        return this._md.mobile();
    },

    isTablet : function () {
        return this._md.tablet();
    },

    isDesktop : function () {
        var isDesktop = !this._md.tablet() && !this._md.mobile();
        return isDesktop;
    },

    // create tab content
    _fillContent : function () {

        // info tab
        this._fillInfoContent();

        // map tab
        this._fillMapContent();

        // media tab

    },

    _fillMapContent : function () {

        // get geojson
        app.api.getTable(function (err, json) {
            if (err) return console.error(err);

            // parse
            this.table_entries = safeParse(json);

            // check
            if (!this.table_entries) return console.error('No table entries.');

            // create table
            this._createTable();
       
        }.bind(this));

    },

    _refreshTable : function () {
        
        // get geojson
        app.api.getTable(function (err, json) {
            if (err) return console.error(err);

            // parse
            this.table_entries = safeParse(json);

            // destroy dynatable
            this._destroyDynatable();

            // recreate table
            this._createTable();
           
        }.bind(this));
    },

    _destroyDynatable : function () {
        this._content.map.innerHTML = '';
        this._dt = {};
        delete this._dt;
    },

    _createTable : function () {
        // https://www.dynatable.com/#existing-json

        // get entries
        var entries = this.table_entries;

        // hide #map
        var map = L.DomUtil.get('map');
        if (map) map.style.display = 'none';

        // create table
        var html = L.DomUtil.create('div', 'table-container', this._content.map);
        var table = '<table id="notes-table">';
        table += '<thead>';
        table += '<th data-dynatable-column="address">  ' + this.locale.table.address + '</th>';
        table += '<th data-dynatable-column="text">     ' + this.locale.table.text + '</th>';
        table += '<th data-dynatable-column="tags">     ' + this.locale.table.tags + '</th>';
        table += '<th data-dynatable-column="latlng">   ' + this.locale.table.latlng + '</th>';
        table += '<th data-dynatable-column="zoom">     ' + this.locale.table.zoom + '</th>';
        table += '<th data-dynatable-column="username"> ' + this.locale.table.username + '</th>';
        table += '<th data-dynatable-column="time">     ' + this.locale.table.time + '</th>';
        table += '<th data-dynatable-column="domain">   ' + this.locale.table.domain + '</th>';
        table += '<th data-dynatable-column="image">   ' + this.locale.table.image + '</th>';
        table += '<th data-dynatable-column="delete">   ' + this.locale.table.delete + '</th>';
        table += '</thead>';
        table += '<tbody>';
        table += '</tbody>';
        table += '</table>';
        html.innerHTML = table;

        // format table entries 
        var table_json = this._parseTableJson(entries);

        // run dynatable
        this._dt = $('#notes-table').dynatable({
          dataset: {
            records: table_json
          },
          inputs : {
            // live search with keyup
            queryEvent : 'keyup change blur'
          }
        });

    },

    _parseTableJson : function (entries) {
        
        // hack to make <a> fn work
        window.mapnotectx = this;

        // create table entries
        var table = [];
        _.each(entries, function (e) {
            var t = {};

            // add entries
            t.address = e.address || '';
            t.tags = e.tags.join(', ');
            t.text = e.text || '';
            t.zoom = parseInt(e.zoom) || '';
            t.username = e.username || '';
            t.time = new Date(e.timestamp).toDateString() || '';
            t.domain = e.portal_tag || '';
           
            // create preview map link
            t.latlng = '<i class="fa fa-globe" aria-hidden="true" onclick="mapnotectx.onMapNoteClick(\'' + e.id + '\', this)"></i>';
            
            // create preview image link
            if (e.image && e.image.original)
            t.image = '<i class="fa fa-picture-o" aria-hidden="true" onclick="mapnotectx.onMapNoteImageClick(\'' + e.image.original + '\')"></i>'
            else {
                t.image = '';
            }

            // create delete link
            t.delete = '<i class="fa fa-trash-o" aria-hidden="true" onclick="mapnotectx.onDeleteNoteClick(\'' + e.id + '\')"></i>';

            // push
            table.push(t);

        }.bind(this));
        return table;
    },

    onMapNoteClick : function (id) {

        // remove old
        this._closePreview();

        // get entry
        var entry = this._preview.entry = this._getEntry(id);

        // return if no entry
        if (!entry) return console.log('no such entry');

        // create popup map 
        var map_container = this._preview.container = L.DomUtil.create('div', 'map-note-container', this._content.map);
        map_container.id = 'map-note-container-' + entry.id;
        var closeBtn = this._preview.close = L.DomUtil.create('div', 'map-note-container-close', map_container);
        closeBtn.innerHTML = this.locale.table.closeBtn;
        L.DomEvent.on(this._preview.close, 'click', this._closePreview, this);

        // set latlng
        var latlng = [entry.coordinates[0], entry.coordinates[1]];

        // create map
        var zoom = entry.zoom + 2;
        mapboxgl.accessToken = 'pk.eyJ1IjoibWFwaWMiLCJhIjoiY2l2MmE1ZW4wMDAwZTJvcnhtZGI4YXdlcyJ9.rD_-Ou1OdKQsHqEqL6FJLg';
        this._preview.map = new mapboxgl.Map({
            container: 'map-note-container-' + entry.id,
            zoom: entry.zoom + 2,
            center: latlng,
            style: 'mapbox://styles/mapbox/satellite-v9',
            hash: false
        });

        // add marker
        var el = document.createElement('div');
        el.id = 'note-preview-marker';
        el.style.background = this.locale.table.mapMarker;
        var marker = new mapboxgl.Marker(el).setLngLat(latlng).addTo(this._preview.map);

        // add popup
        var popup = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: false,
            anchor : 'bottom',
            offset : [10, 0]
        })
        .setLngLat(latlng)
        .setHTML(this._createPopupHTML(entry))
        .addTo(this._preview.map);

    },

    _createPopupHTML : function (p) {
        
       
        // get tags
        var tags = safeParse(p.tags);
        var niceTags = app.locale.notes.keywords + ': ';
        _.each(tags, function (t) {
            var v = _.upperCase(t) + ' ';
            niceTags += v 
        });

        // get name
        var name = app.locale.notes.writtenBy + ': ' + _.capitalize(p.username);

        // get image
        var image = (p.image && p.image.original) ? p.image.original : false;

        // create html
        var html = '<div class="notes-popup">';
        
        // image
        var notesImgClass = image ? 'notes-image background-none' : 'notes-image';
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


            // text
            html    += '    <div class="notes-text">'
            html    +=          p.text
            html    += '    </div>'

            
            // address
            html    += '    <div class="notes-address">';
            html    += '        <i class="fa fa-map-marker" aria-hidden="true"></i>' + p.address;
            html    += '    </div>'
         
        html    += '    </div>'
    
        html    += '</div>'
        return html;
    },

    _preview : {},

    _closePreview : function () {

        // remove map
        var map = this._preview.map;
        if (map) map.remove();

        // remove event
        this._preview.close && L.DomEvent.off(this._preview.close, 'click', this._closePreview);

        // remove container
        var container = this._preview.container;
        if (container && container.parentNode) container.parentNode.removeChild(container);

        // clear 
        this._preview = {};
    },

    onDeleteNoteClick : function (id) {

        // confirm
        var ok = confirm(this.locale.table.confirmDelete);
        if (!ok) return;

        // get entry
        var entry = this._getEntry(id);
        if (!entry) return console.log('no such entry');

        app.api.deleteRecord({id : id}, function (err, results) {
            if (err) return alert(err);

            // parse
            var res = safeParse(results);

            // catch error
            if (res.error) return alert(res.error);

            // refresh
            this._refreshTable();

        }.bind(this));
    },

    onMapNoteImageClick : function (image_url) {

        // close existing
        this._closePreview();

        // create container
        this._preview.container = L.DomUtil.create('div', 'admin-image-preview', this._content.map);
        
        // create close btn
        var closeBtn = this._preview.close = L.DomUtil.create('div', 'map-note-container-close', this._preview.container);
        closeBtn.innerHTML = this.locale.table.closeBtn;
        L.DomEvent.on(this._preview.close, 'click', this._closePreview, this);

        // insert image
        this._preview.container.innerHTML = '<img src="' + image_url + '">';
    },

    _getEntry : function (id) {
        var entry = _.find(this.table_entries, function (t) {
            return t.id == id;
        });
        return entry;
    },

    _fillInfoContent : function () {
        var infoContent = L.DomUtil.create('div', 'admin-info-text', this._content.info);
        var loginText = this.locale.admin.info.loginLinkText;
        var text = this.locale.admin.info.loginText;
        infoContent.innerHTML = '<a target="_blank" href="https://blog.mittlier.no/wp-admin/">' + loginText + '</a>' + ' ' + text;
    },

    // helper fn to show/hide the three tabs
    _showInfo  : function () { this._show('info');},
    _showMap   : function () { this._show('map');},
    _showMedia : function () { this._show('media');},
    _show : function (page) {

        // hide all
        if (page != 'info') this._content.info.style.display = 'none';
        if (page != 'map') this._content.map.style.display = 'none';
        if (page != 'media') this._content.media.style.display = 'none';

        // show selected
        this._content[page].style.display = 'block';

        // highlight button
        this._highlightButton(page);

    },

    // highlight selected button
    _highlightButton : function (highlighted) {
        for (var btn in this._buttons) {
            L.DomUtil.removeClass(this._buttons[btn].div, 'highlighted')
        };
        L.DomUtil.addClass(this._buttons[highlighted].div, 'highlighted');
    },

    // helper fn
    post : function (path, options, done) {
        this._post(path, JSON.stringify(options), function (err, response) {
            done && done(err, response);
        });
    },
    _post : function (path, json, done, context, baseurl) {
        var http = new XMLHttpRequest();
        var url = window.location.origin + '/';
        url += path;

        // open
        http.open("POST", url, true);

        // set json header
        http.setRequestHeader('Content-type', 'application/json');

        // response
        http.onreadystatechange = function() {
            if (http.readyState == 4) {
                if (http.status == 200) {
                    done && done(null, http.responseText); 
                } else {
                    done && done(http.status, http.responseText);
                }
            }
        };

        // send
        http.send(json);
    },
});