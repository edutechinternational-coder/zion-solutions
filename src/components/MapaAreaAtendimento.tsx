import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// Token da variável de ambiente
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string;

// Polígono do bairro Monte Sião, Manaus/AM
// Extraído da medição no Google Maps (linha branca marcada pelo usuário)
// Coordenadas [longitude, latitude]
const MONTE_SIAO_POLYGON: [number, number][] = [
  // Norte — Av. Prof. Agostinha de Lima Brito
  [-59.9380, -3.0085],
  [-59.9295, -3.0090],
  [-59.9230, -3.0110],
  // Nordeste — descendo pela Av. Alarico Furtado
  [-59.9195, -3.0155],
  [-59.9188, -3.0210],
  // Leste — limite com área verde / Av. Alamanda
  [-59.9195, -3.0270],
  [-59.9215, -3.0310],
  // Sul — R. São Paulo / R. Braga Mendes
  [-59.9245, -3.0340],
  [-59.9290, -3.0355],
  [-59.9340, -3.0360],
  [-59.9390, -3.0355],
  // Sudoeste
  [-59.9430, -3.0330],
  [-59.9455, -3.0295],
  // Oeste — R. Marumbi / R. Betafogo
  [-59.9460, -3.0240],
  [-59.9450, -3.0185],
  [-59.9430, -3.0140],
  [-59.9400, -3.0105],
  // Fechamento ao norte
  [-59.9380, -3.0085],
];

// Centro do bairro Monte Sião
const CENTER: [number, number] = [-59.9325, -3.0225];
const ZOOM = 14;

export function MapaAreaAtendimento() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: (import.meta.env.VITE_MAPBOX_STYLE_URL as string) || "mapbox://styles/mapbox/streets-v12",
      center: CENTER,
      zoom: ZOOM,
      attributionControl: false,
    });

    mapRef.current = map;

    map.addControl(new mapboxgl.AttributionControl({ compact: true }));
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      // Área de atendimento — polígono preenchido
      map.addSource("monte-siao", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: { name: "Monte Sião" },
          geometry: {
            type: "Polygon",
            coordinates: [MONTE_SIAO_POLYGON],
          },
        },
      });

      // Fill semitransparente
      map.addLayer({
        id: "monte-siao-fill",
        type: "fill",
        source: "monte-siao",
        paint: {
          "fill-color": "#16a34a", // verde primário do projeto
          "fill-opacity": 0.18,
        },
      });

      // Contorno do bairro
      map.addLayer({
        id: "monte-siao-border",
        type: "line",
        source: "monte-siao",
        paint: {
          "line-color": "#16a34a",
          "line-width": 2.5,
          "line-dasharray": [4, 2],
        },
      });

      // Label no centro do bairro
      map.addLayer({
        id: "monte-siao-label",
        type: "symbol",
        source: "monte-siao",
        layout: {
          "text-field": "Área de Atendimento\nZion Soluções",
          "text-size": 13,
          "text-anchor": "center",
          "text-font": ["Open Sans SemiBold", "Arial Unicode MS Bold"],
        },
        paint: {
          "text-color": "#14532d",
          "text-halo-color": "#ffffff",
          "text-halo-width": 2,
        },
      });

      // Marker no centro
      new mapboxgl.Marker({ color: "#16a34a" })
        .setLngLat(CENTER)
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<div style="font-family:sans-serif;padding:4px 2px">
              <strong>Zion Soluções</strong><br/>
              <span style="font-size:12px;color:#555">Bairro Monte Sião · Manaus/AM</span><br/>
              <span style="font-size:12px;color:#555">Crédito de R$100 a R$1.000</span>
            </div>`,
          ),
        )
        .addTo(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <section aria-label="Área de atendimento" className="mx-auto max-w-6xl px-4 py-16">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-semibold">Onde atuamos</h2>
        <p className="mt-3 text-muted-foreground">
          A Zion opera exclusivamente no bairro Monte Sião, em Manaus/AM. Se você mora ou trabalha
          aqui, o crédito é para você.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
        <div
          ref={mapContainer}
          className="h-[420px] w-full"
          role="img"
          aria-label="Mapa destacando o bairro Monte Sião em Manaus"
        />
      </div>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        Área aproximada — atendimento condicionado à confirmação de endereço no bairro.
      </p>
    </section>
  );
}
