console.log("✅ tour.js is running");

document.addEventListener("DOMContentLoaded", function () {
    console.log("✅ DOM Loaded");

    function getQueryParam(param) {
        let urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    }

    const siteId = getQueryParam("site_id");

    if (!siteId) {
        document.getElementById("site-title").innerText = "Error: No site selected!";
        return;
    }

    fetch("assets/data/sites.csv")
        .then((res) => res.text())
        .then((data) => {
            let parsedData = Papa.parse(data, { header: true }).data;
            let site = parsedData.find((s) => s.site_id.trim() === siteId.trim());

            if (!site) {
                document.getElementById("site-title").innerText = "Error: Site not found!";
                return;
            }

            document.getElementById("site-title").innerText = site.name;
            document.getElementById("site-name").innerText = site.name;
            document.getElementById("site-description").innerText = site.description;

            let lat = parseFloat(site.lat);
            let lon = parseFloat(site.long);

            if (isNaN(lat) || isNaN(lon)) {
                document.getElementById("tour-map-container").innerHTML = "<p style='color: red;'>Invalid location data. Map cannot load.</p>";
                return;
            }

            // Initialize the map
            const tourMap = L.map("tour-map").setView([lat, lon], 14);
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: "&copy; OpenStreetMap contributors",
            }).addTo(tourMap);

            // Fetch and display eBird observations FIRST
            let ebirdId = site.ebird_id ? site.ebird_id.trim() : null;
            if (ebirdId) {
                const observationDays = document.getElementById("observation-days");
                const observationsList = document.getElementById("observations-list");

                function fetchObservations(days) {
                    observationsList.innerHTML = "Loading...";

                    fetch(`https://api.ebird.org/v2/data/obs/${ebirdId}/recent?back=${days}`, {
                        headers: { "X-eBirdApiToken": "tjd5dj8076eb" },
                    })
                        .then((res) => res.json())
                        .then((data) => {
                            observationsList.innerHTML = data.length
                                ? data.map(obs => `
                                    <div class="observation-item">
                                        <strong>${obs.comName}</strong><br>
                                        Seen on: ${new Date(obs.obsDt).toLocaleDateString()}<br>
                                        Count: ${obs.howMany || "N/A"}
                                    </div>`).join("")
                                : "No observations found.";
                        })
                        .catch(() => {
                            observationsList.innerText = "Failed to load observations.";
                        });
                }

                fetchObservations(observationDays.value);

                observationDays.addEventListener("change", () => {
                    fetchObservations(observationDays.value);
                });
            }

            // Add Locate Me functionality
            const locateBtn = document.getElementById("locate-btn");
            let userMarker;

            locateBtn.addEventListener("click", () => {
                if (!navigator.geolocation) {
                    alert("Geolocation is not supported by your browser.");
                    return;
                }

                navigator.geolocation.watchPosition(
                    (position) => {
                        const { latitude, longitude } = position.coords;

                        // Remove existing marker
                        if (userMarker) tourMap.removeLayer(userMarker);

                        // Add a new marker for the user's location
                        userMarker = L.marker([latitude, longitude], {
                            icon: L.divIcon({
                                className: "user-location",
                                html: '<div style="width: 12px; height: 12px; background: blue; border-radius: 50%;"></div>',
                                iconSize: [12, 12],
                            }),
                        }).addTo(tourMap);

                        // Center the map on the user's location
                        tourMap.setView([latitude, longitude], tourMap.getZoom());
                    },
                    (error) => {
                        alert("Unable to retrieve your location. Please check your location settings.");
                    },
                    { enableHighAccuracy: true }
                );
            });

            // Add Fullscreen functionality (AFTER eBird loads)
            const fullscreenBtn = document.getElementById("fullscreen-btn");

            fullscreenBtn.addEventListener("click", () => {
                const mapContainer = document.getElementById("tour-map-container");

                if (!document.fullscreenElement) {
                    mapContainer.requestFullscreen().catch(err => {
                        console.error(`Error attempting to enable fullscreen: ${err.message}`);
                    });
                    fullscreenBtn.textContent = "Exit Fullscreen";
                } else {
                    document.exitFullscreen();
                    fullscreenBtn.textContent = "Fullscreen";
                }
            });

            document.addEventListener("fullscreenchange", () => {
                if (!document.fullscreenElement) {
                    fullscreenBtn.textContent = "Fullscreen";
                }
            });

            console.log("✅ Fullscreen and Locate Me functionalities added.");
        })
        .catch(error => console.error("❌ Error loading site data:", error));
});
