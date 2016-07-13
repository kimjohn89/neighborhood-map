var GoogleMap = function(){
    //this.map = null;
    //this.placeService = null;
    this.map = new google.maps.Map(document.getElementById('map'), {zoom: 15});
    this.placeService = new google.maps.places.PlacesService(this.map);
    this.infoWindow = new google.maps.InfoWindow();
    this.searchBox;
    this.markers = new Map();
    this.slideIndex = -1;
};

GoogleMap.prototype = {
    init: function(){
        var self = this;

        self.map.addListener('click', function(event){
            self.clickListener(event);
        });

        var mapSearchInput = $('#map__search');
        mapSearchInput.css('display','block');
        self.searchBox = new google.maps.places.SearchBox(mapSearchInput[0]);
        self.map.controls[google.maps.ControlPosition.TOP_LEFT].push(mapSearchInput[0]);
        self.map.addListener('bounds_changed', function() {
            self.searchBox.setBounds(self.map.getBounds());
        });
        self.searchBox.addListener('places_changed', function(){
            self.processSearchBox();
        });

    },
    clickListener: function(event) {
        var self = this;
        var request = {
            location: event.latLng,
            radius: 100
        };
        self.placeService.nearbySearch(request, function(results, status) {
            self.infoWindow.close();
            if (status == google.maps.places.PlacesServiceStatus.OK) {
                self.showNearbyInfoWindow(results, event.latLng);
                self.processNearbyInfoWindow(results);
            }
        });
    },
    processSearchBox: function() {
        var self = this;
        var places = self.searchBox.getPlaces();
        if (places.length == 0) return;
        places.forEach(function(place) {
            self.createMapMarker(place.name, place);
            self.updatePlaceList(place.name, place);
        });
    },
    showNearbyInfoWindow: function(results, location) {
        var content = $('<div class="selectWindow"></div>');
        content.append($('<ul id="placeNames"></ul>'));
        for(var place of results){
            content.append($('<li><a href="#" id="' + place.id + '">' + place.name + '</a></li>'));
        }
        this.infoWindow.setContent(content[0]);
        this.infoWindow.setPosition(location);
        this.infoWindow.open(this.map);
    },
    processNearbyInfoWindow: function(results) {
        var self = this;
        var city = results[0].name;
        for(var place of results){
            $('#' + place.id).click((function(name) {
                return function() {
                    var title = name.split(",");
                    self.placeService.textSearch({query: name},
                        function(results, status) {
                            if (status == google.maps.places.PlacesServiceStatus.OK) {
                                self.updatePlaceList(title[0], results[0]);
                                self.createMapMarker(title[0], results[0]);
                            }
                        }
                    );
                    self.infoWindow.close();
                }
            })(place.name + "," + city));
        }
    },
    showMarkerInfoWindow: function(placeTitle, place_id) {
        var self = this;
        self.placeService.getDetails({placeId: place_id}, function(place, status){
            if(status == google.maps.places.PlacesServiceStatus.OK){
                var content = $('<div class="markerWindow"></div>');
                content.append($('<h3>' + placeTitle + '</h3>'));
                var content_list = $('<ul></ul>');
                content.append(content_list);
                content_list.append($('<li>주소: '+place.formatted_address+'</li>'));
                if(place.website)
                    content_list.append($('<li>웹사이트: <a href="'+place.website+'" target="_blank">'+
                        place.website+'</a></li>'));
                var imgDiv = $('<div class="markerWindow__img"></div>');
                content.append(imgDiv);
                if(place.photos)
                    imgDiv.append($('<img src="'
                        +place.photos[0].getUrl({'maxWidth': 200, 'maxHeight': 200})+
                        '" alt="장소 이미지">'));
                self.infoWindow.setContent(content[0]);
                self.infoWindow.setPosition(place.geometry.location);
                self.infoWindow.open(self.map);
            }
        });
    },
    showDetailInfoWindow: function(placeTitle, place_id) {
        var self = this;
        console.log(placeTitle+": "+place_id);
        self.placeService.getDetails({placeId: place_id}, function(place, status){
            if(status == google.maps.places.PlacesServiceStatus.OK){
                var popup = $('.placeInfoWindow');
                popup.css('display','block');

                var content = $('.placeInfoContent');
                content.append($('<button id="close-btn"></button>'));
                content.append($('<h3>' + placeTitle + '&nbsp;<a id="streetview" href="#"><img height="24px" src="image/streetview.png"></a></h3>'));

                var content_list = $('<ul></ul>');
                content.append(content_list);
                content_list.append($('<li>주소: '+place.formatted_address+'</li>'));

                self.showStreetView(place.geometry.location);

                if(place.website)
                    content_list.append($('<li>웹사이트: <a href="'+place.website+'" target="_blank">'+
                        place.website+'</a></li>'));
                if(place.photos){
                    var photoSlideDiv = $('<div class="photoSlideDiv"></div>')
                    content.append(photoSlideDiv);
                    self.showPlaceImgSlides(photoSlideDiv, place.photos);
                }

                var wikiDiv = $('<div class="wikipedia"></div>');
                content.append(wikiDiv);

                self.showWikipediaList(placeTitle, place, wikiDiv);

                $('#close-btn').click(function(){
                    popup.css('display','none');
                    content.empty();
                });

            }
        });
    },
    showStreetView: function(location) {
        var self = this;
        $('#streetview').click(function() {
            var streetViewService = new google.maps.StreetViewService();
            var STREETVIEW_MAX_DISTANCE = 100;
            streetViewService.getPanoramaByLocation(location,
                STREETVIEW_MAX_DISTANCE,
                function(streetViewPanoramaData, status) {
                    if (status == google.maps.StreetViewStatus.OK) {
                        $('.panoDiv').css('display', 'block');
                        var panorama = new google.maps.StreetViewPanorama(
                            document.getElementById('pano'), {
                                position: location,
                                pov: {
                                    heading: 34,
                                    pitch: 10
                                },
                                enableCloseButton: true
                            });
                        self.map.setStreetView(panorama);
                        panorama.addListener('visible_changed', function(){
                            console.log("나 여기:"+panorama.getVisible());
                            if(!panorama.getVisible())
                                $('.panoDiv').css('display', 'none');
                        });
                    } else {
                        $('.panoDiv').css('display', 'none');
                    }
                });
        });
    },

    showPlaceImgSlides: function(photoSlideDiv, photos){
        var self = this;
        photoSlideDiv.append($('<a id="left-floating-btn" href="#">❮</a>'));
        photoSlideDiv.append($('<a id="right-floating-btn" href="#">❯</a>'));
        for (var i = 0; i < photos.length; i++) {
            photoSlideDiv.append($('<img class="photoSlides" src="' +
                photos[i].getUrl({ 'maxWidth': 240, 'maxHeight': 240 }) + '" alt="장소 이미지">'));
        }
        self.slideIndex = -1;
        self.showNextImage(true);
        $('#left-floating-btn').click(function() {
            self.showNextImage(false);
        });
        $('#right-floating-btn').click(function() {
            self.showNextImage(true);
        });
    },
    showNextImage: function(isNext){
        var imgs = document.getElementsByClassName('photoSlides');
        if(isNext){
            if(this.slideIndex<imgs.length-1) ++this.slideIndex;
        }
        else{
            if(this.slideIndex>0) --this.slideIndex;
        }
        if(this.slideIndex==imgs.length-1) $('#right-floating-btn').css('display','none');
        else $('#right-floating-btn').css('display','block');
        if(this.slideIndex==0) $('#left-floating-btn').css('display','none');
        else $('#left-floating-btn').css('display','block');
        for(var i=0; i<imgs.length; i++){
            imgs[i].style.display = 'none';
        }
        imgs[this.slideIndex].style.display = 'block';
    },
    showWikipediaList: function(placeTitle, placeData, wikiDiv) {

        var locality;
        for(var address of placeData.address_components){
            if(address.types[0]=="locality"){
                locality=address.long_name; break;
            }
        }
        console.log(locality);
        wikiDiv.append($('<h4>위키백과</h4>'))
        wikiDiv.append($('<ul></ul>'));
        var wikiList = wikiDiv.children('ul');
        var wikiURL = "http://ko.wikipedia.org/w/api.php";
        wikiURL += '?' + $.param({
            'action': "opensearch",
            'search': placeTitle,
            'format': "json",
            'callback': "wikiCallback"
        });

        var wikiRequestTimeout = setTimeout(function() {
           wikiDiv.empty();
        }, 8000);

        $.ajax({
             url: wikiURL,
             contentType: "application/json; charset=utf-8",
             dataType: "jsonp"
        }).done(function(response) {
            var articles = response[1];
            var contents = response[2];
            var urls = response[3];
            var found = false;
            for (var i = 0; i < articles.length; i++) {
                if(articles[i].indexOf(placeTitle)>=0&&contents[i].indexOf(locality)>=0){
                    var articleStr = articles[i];
                    var url = urls[i];
                    wikiList.append('<li><a href="' + url + '">' + articleStr + '</a></li>');
                    found = true;
                }
            };
            if(!found) wikiDiv.empty();
            clearTimeout(wikiRequestTimeout);
        });

    },
    createMapMarker: function(placeTitle, placeData) {
        var self = this;
        console.log(placeData.place_id);
        var marker = new google.maps.Marker({
            map: self.map,
            position: placeData.geometry.location,
            title: placeTitle,
            place_id: placeData.place_id
        });
        self.markers.set(marker.place_id, marker);
        marker.setMap(self.map)
        marker.addListener('click', function(){
            self.showMarkerInfoWindow(placeTitle, placeData.place_id);
        });
        self.renderMap(marker.position);
    },
    updatePlaceList: function(placeTitle, placeData){
        var self = this;
        var registerPlaces = $('.regPlaceDiv');
        if(registerPlaces.css('display')=='none'){
            registerPlaces.css('display','block');
        }
        $('#regPlaceList').append('<li><a href="#" id="'+placeData.place_id+'">'+
            placeTitle+'</a><button class="del-btn"></button></li>');
        $('#'+placeData.place_id).click(function(){
            self.showDetailInfoWindow(placeTitle, placeData.place_id);
        });
        $('.del-btn').click(function(){
            var title = $(this).parent().text();
            var id = $(this).siblings('a').attr('id');
            var marker = self.markers.get(placeData.place_id);
            marker.setMap(null);
            $(this).parent().remove();
        });
    },
    renderMap: function(location){
        if(this.markers.size>=2){
            var bounds = new google.maps.LatLngBounds();
            for(var aMarker of this.markers.values())
                bounds.extend(aMarker.getPosition());
            this.map.fitBounds(bounds);
            this.map.setCenter(bounds.getCenter());
        }
        else this.map.setCenter(location);
    },


};