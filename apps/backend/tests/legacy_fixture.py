from uuid import uuid4

from pydantic import JsonValue


def legacy_payload() -> dict[str, JsonValue]:
    first = str(uuid4())
    second = str(uuid4())
    return {
        "format": "voxnovel-legacy-api-v1",
        "exported_at": "2026-11-20T00:00:00Z",
        "obras": [
            {
                "id": "synthetic-old-id",
                "slug": "synthetic-book",
                "obra": "Synthetic private title",
                "pagina_atual": 4,
                "total_caps": 20,
                "fonte_ativa": first,
                "fontes": [
                    {
                        "id": first,
                        "provider": "A",
                        "title": "Synthetic",
                        "url_base": "https://source.example/book",
                        "chapter_ids": [11, 18, 24, 35],
                        "pagina_atual": 4,
                        "total_caps": 20,
                    },
                    {
                        "id": second,
                        "provider": "B",
                        "title": "Synthetic",
                        "url_base": "https://source.example/other",
                        "pagina_atual": 9,
                        "total_caps": 20,
                    },
                ],
            }
        ],
        "filtros": {"palavras": [], "frases": [], "regex": []},
        "config": {"velocidade": 1.25},
        "downloads": [
            {
                "obra_id": "synthetic-old-id",
                "cap": 2,
                "texto": "Synthetic private saved text.",
            }
        ],
    }
