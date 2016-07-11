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
        /*
        self.placeService.textSearch({query: placeName},
            function(results, status){
                if (status == google.maps.places.PlacesServiceStatus.OK) {
                    var placeData = results[0];
                    self.map.setCenter(placeData.geometry.location);
                }
            }
        );
        */

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
            var content = $('<div class="selectWindow"></div>');
            content.append($('<ul id="placeNames"></ul>'));
            if (status == google.maps.places.PlacesServiceStatus.OK) {
                for (var i = 0; i < results.length; i++) {
                    var place = results[i];
                    var clickID = "place-"+i;
                    var placeName = $('<li><a href="#" id="'+clickID+'">'+place.name+'</a></li>');
                    content.append(placeName);
                }
            }
            self.infoWindow.setContent(content.html());
            self.infoWindow.setPosition(event.latLng);
            self.infoWindow.open(self.map);
            for (var i = 0; i < results.length; i++) {
                var place = results[i];
                $('#place-'+i).click((function(name){
                        return function(){
                            var title = name.split(",");
                            self.placeService.textSearch({query: name},
                                function(results, status) {
                                    if (status == google.maps.places.PlacesServiceStatus.OK) {
                                        self.updatePlaceList(title[0],results[0].place_id);
                                        self.createMapMarker(results[0],title[0]);
                                    }
                                }
                            );
                            self.infoWindow.close();
                        }
                    })(place.name+","+results[0].name)
                );
            }
        });
    },
    processSearchBox: function() {
        var self = this;
        var places = self.searchBox.getPlaces();
        if (places.length == 0) return;
        places.forEach(function(place) {
            console.log("processSearchBox: "+place.place_id);
            self.createMapMarker(place, place.name);
            self.updatePlaceList(place.name, place.place_id);
        });
    },
    showMarkerInfoWindow: function(place_id, placeTitle) {
        var self = this;
        self.placeService.getDetails({placeId: place_id}, function(place, status){
            if(status == google.maps.places.PlacesServiceStatus.OK){
                var content = $('<div class="markerWindow"></div>');
                content.append($('<h3>' + placeTitle + '</h3>'));
                var content_list = $('<ul></ul>');
                content.append(content_list);
                content_list.append($('<li>주소: '+place.formatted_address+'</li>'));
                if(place.website)
                    content_list.append($('<li>웹사이트: <a href="'+place.website+'">'+place.website+'</a></li>'));
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
    showDetailInfoWindow: function(place_id, placeTitle) {
        var self = this;
        console.log(placeTitle+": "+place_id);
        self.placeService.getDetails({placeId: place_id}, function(place, status){
            if(status == google.maps.places.PlacesServiceStatus.OK){
                var popup = $('.placeInfoWindow');
                popup.css('display','block');

                var content = $('.placeInfoContent');
                content.append($('<button id="close-btn"></button>'));
                content.append($('<h3>' + placeTitle + '</h3>'));
                var content_list = $('<ul></ul>');
                content.append(content_list);
                content_list.append($('<li>주소: '+place.formatted_address+'</li>'));
                if(place.website)
                    content_list.append($('<li>웹사이트: <a href="'+place.website+'">'+place.website+'</a></li>'));
                if(place.photos){
                    var photoSlideDiv = $('<div class="photoSlideDiv"></div>')
                    content.append(photoSlideDiv);
                    photoSlideDiv.append($('<a id="left-floating-btn" href="#">◄</a>'));
                    photoSlideDiv.append($('<a id="right-floating-btn" href="#">►</a>'));
                    for(var i=0; i<place.photos.length; i++){
                        photoSlideDiv.append($('<img class="photoSlides" src="'
                            +place.photos[i].getUrl({'maxWidth': 240, 'maxHeight': 240})+
                            '" alt="장소 이미지">'));
                    }
                    self.slideIndex = -1;
                    self.showPlaceImgSlides(true);
                    $('#left-floating-btn').click(function(){
                        self.showPlaceImgSlides(false);
                    });
                    $('#right-floating-btn').click(function(){
                        self.showPlaceImgSlides(true);
                    });
                }
                $('#close-btn').click(function(){
                    popup.css('display','none');
                    content.empty();
                });

            }
        });
    },
    showPlaceImgSlides: function(nextSlide){
        var imgs = document.getElementsByClassName('photoSlides');
        if(nextSlide) this.slideIndex = (this.slideIndex+1)%imgs.length;
        else if(this.slideIndex>1) --this.slideIndex;
        console.log(this.slideIndex);
        for(var i=0; i<imgs.length; i++){
            imgs[i].style.display = 'none';
        }
        imgs[this.slideIndex].style.display = 'block';
    },
    createMapMarker: function(placeData, placeTitle) {
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
            self.showMarkerInfoWindow(placeData.place_id, placeTitle);
        });
        if(self.markers.size>=2){
            var bounds = new google.maps.LatLngBounds();
            for(var aMarker of self.markers.values())
                bounds.extend(aMarker.getPosition());
            /*
            for(var i=0; i<self.markers.length; i++)
                bounds.extend(self.markers[i].getPosition());
            */
            // fit the map to the new marker
            self.map.fitBounds(bounds);
            // center the map
            self.map.setCenter(bounds.getCenter());
        }
        else self.map.setCenter(marker.position);
    },
    updatePlaceList: function(title, place_id){
        var self = this;
        var registerPlaces = $('.regPlaceDiv');
        if(registerPlaces.css('display')=='none'){
            registerPlaces.css('display','block');
        }
        $('#regPlaceList').append('<li><a href="#" id="'+place_id+'">'+title+'</a><button class="del-btn"></button></li>');
        $('#'+place_id).click(function(){
            self.showDetailInfoWindow(place_id, title);
        });
        $('.del-btn').click(function(){
            var title = $(this).parent().text();
            var id = $(this).siblings('a').attr('id');
            var marker = self.markers.get(place_id);
            marker.setMap(null);
            $(this).parent().remove();
            /*
            for(var i=0; i<self.markers.length; i++){
                if(self.markers[i].title==title){
                    self.markers[i].setMap(null);
                    $(this).parent().remove();
                }
            }*/
        });
    }
};