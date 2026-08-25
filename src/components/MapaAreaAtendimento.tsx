import { useEffect, useRef, useState } from "react";

// mapbox-gl é carregado dinamicamente para evitar bundle SSR (>2MB)
// O componente é client-only

let mapboxgl: typeof import("mapbox-gl") | null = null;

async function getMapbox() {
  if (!mapboxgl) {
    const mod = await import("mapbox-gl");
    // handle both ESM default and CJS exports
    const m = (mod as unknown as { default?: typeof import("mapbox-gl") }).default ?? mod;
    mapboxgl = m as typeof import("mapbox-gl");
    // pk.* tokens are public by Mapbox design — safe to include in client code.
    // Falls back to the hardcoded public token if the env var is not injected
    // (e.g. Lovable preview environment).
    const token =
      (import.meta.env["VITE_LOVABLE_CONNECTOR_MAPBOX_PUBLIC_TOKEN"] as string | undefined) ||
      (import.meta.env["VITE_MAPBOX_ACCESS_TOKEN"] as string | undefined) ||
      "pk.eyJ1IjoidGVjaC1lZHUtbGFiIiwiYSI6ImNtbjJ6d3VkNzB6OG8ycHNqMTJ0OGNwN3YifQ.mc06DX2ubMuDcbfJo2R7zA";
    mapboxgl.accessToken = token;
  }
  return mapboxgl;
}

// Polígono do bairro Monte Sião, Manaus/AM
// Todos os vértices fornecidos pelo usuário via Google Maps "Medir distância"
// Convertidos de [lat, lng] → [lng, lat] (formato GeoJSON/Mapbox)
const MONTE_SIAO_POLYGON: [number, number][] = [
  [-59.937227, -3.010327], // 1  noroeste
  [-59.930395, -3.009926], // 2  norte
  [-59.928936, -3.013483], // 3  nordeste
  [-59.931168, -3.012883], // 4
  [-59.931813, -3.013998], // 5
  [-59.930620, -3.023091], // 6  leste
  [-59.932173, -3.028916], // 7  sudeste
  [-59.932270, -3.028921], // 8
  [-59.932353, -3.023511], // 9
  [-59.933442, -3.022397], // 10
  [-59.933399, -3.021626], // 11
  [-59.933485, -3.020040], // 12
  [-59.935202, -3.019997], // 13 oeste
  [-59.935674, -3.018197], // 14
  [-59.935416, -3.017169], // 15
  [-59.936489, -3.014212], // 16
  [-59.936146, -3.013011], // 17
  [-59.937262, -3.010397], // 18 fechamento → volta ao ponto 1
];

// Centro calculado a partir do bbox dos pontos reais
const CENTER: [number, number] = [-59.9330, -3.0194];
const ZOOM = 14;

export function MapaAreaAtendimento() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [tokenMissing, setTokenMissing] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    let cancelled = false;

    getMapbox().then((mgl) => {
      if (cancelled || !mapContainer.current || mapRef.current) return;

      // Guard: if token is missing, show a placeholder instead of crashing
      if (!mgl.accessToken) {
        console.warn("[MapaAreaAtendimento] VITE_MAPBOX_ACCESS_TOKEN não configurado");
        setTokenMissing(true);
        return;
      }

      // Inject CSS once
      if (!document.querySelector('link[href*="mapbox-gl"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://api.mapbox.gl/mapbox-gl-js/v3.9.0/mapbox-gl.css";
        document.head.appendChild(link);
      }

      // Token already set in getMapbox() — do NOT set again here to avoid timing issues
      const map = new mgl.Map({
        container: mapContainer.current,
        style:
          (import.meta.env.VITE_MAPBOX_STYLE_URL as string) ||
          "mapbox://styles/mapbox/streets-v12",
        center: CENTER,
        zoom: ZOOM,
        attributionControl: false,
      });

      mapRef.current = map;

      map.addControl(new mgl.AttributionControl({ compact: true }));
      map.addControl(new mgl.NavigationControl({ showCompass: false }), "top-right");

      map.on("load", () => {
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

        map.addLayer({
          id: "monte-siao-fill",
          type: "fill",
          source: "monte-siao",
          paint: {
            "fill-color": "#16a34a",
            "fill-opacity": 0.18,
          },
        });

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

        new mgl.Marker({ color: "#16a34a" })
          .setLngLat(CENTER)
          .setPopup(
            new mgl.Popup({ offset: 25 }).setHTML(
              `<div style="font-family:sans-serif;padding:4px 2px">
                <strong>Zion Soluções</strong><br/>
                <span style="font-size:12px;color:#555">Bairro Monte Sião · Manaus/AM</span><br/>
                <span style="font-size:12px;color:#555">Crédito de R$100 a R$1.000</span>
              </div>`,
            ),
          )
          .addTo(map);
      });
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
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
        {tokenMissing ? (
          <div className="flex h-[420px] w-full items-center justify-center bg-secondary/40">
            <div className="text-center space-y-2 text-muted-foreground">
              <p className="text-sm font-medium">Mapa indisponível neste ambiente</p>
              <p className="text-xs">Bairro Monte Sião · Manaus/AM</p>
            </div>
          </div>
        ) : (
          <div
            ref={mapContainer}
            className="h-[420px] w-full"
            role="img"
            aria-label="Mapa destacando o bairro Monte Sião em Manaus"
          />
        )}
      </div>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        Área aproximada — atendimento condicionado à confirmação de endereço no bairro.
      </p>
    </section>
  );
}
