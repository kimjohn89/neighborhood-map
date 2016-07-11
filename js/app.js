var appInit = function(){
    var initLocInput = document.getElementById('startLoc__Input');
    var searchBox = new google.maps.places.SearchBox(initLocInput);

    searchBox.addListener('places_changed', function(){
        var places = searchBox.getPlaces();
        if (places.length == 0) return;
        var googleMap = new GoogleMap();
        places.forEach(function(place) {
            googleMap.map.setCenter(place.geometry.location);
        });
        googleMap.init();
        $('.startLoc').css('display','none');
    });
}

appInit();