import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// Token da variável de ambiente
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string;

// Polígono do bairro Monte Sião, Manaus/AM
// Pontos âncora fornecidos pelo usuário via Google Maps:
//   A: -3.027509, -59.934996  (lado oeste)
//   B: -3.010327, -59.937227  (lado norte-oeste)
//   C: -3.009097, -59.930201  (lado norte-leste)
// Demais vértices estimados para fechar o perímetro (~4,79 km, ~90 ha)
// Coordenadas [longitude, latitude]
const MONTE_SIAO_POLYGON: [number, number][] = [
  // Norte — entre B e C (linha superior da área)
  [-59.9372, -3.0103], // B (noroeste)
  [-59.9302, -3.0091], // C (nordeste)
  // Descendo pelo lado leste
  [-59.9255, -3.0130],
  [-59.9230, -3.0185],
  [-59.9228, -3.0240],
  [-59.9245, -3.0295],
  // Sul
  [-59.9265, -3.0340],
  [-59.9310, -3.0360],
  [-59.9360, -3.0355],
  // Sudoeste
  [-59.9400, -3.0330],
  [-59.9415, -3.0295],
  // Lado oeste — passa pelo ponto A
  [-59.9420, -3.0255],
  [-59.9413, -3.0210],
  [-59.9350, -3.0275], // A (oeste)
  [-59.9395, -3.0185],
  [-59.9385, -3.0148],
  [-59.9372, -3.0103], // fechamento em B
];

// Centro calculado a partir dos pontos reais
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
