"""
Phase 2 — The RAG Knowledge Linker.

A local, dependency-light stand-in for a production vector DB: TF-IDF +
cosine similarity over a small corpus of machine-manual chunks. The retrieval
*interface* (retrieve(fault_code, features) -> List[ManualExcerpt]) is exactly
what you'd expose from a real Chroma/Pinecone/pgvector-backed service, so
swapping the backend later means replacing ManualIndex internals only.
"""
from __future__ import annotations

from typing import Dict, List

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from models import ManualExcerpt

# Mock technical manual corpus. In production this is chunked, embedded, and
# stored per-asset-model in a real vector store (with citations back to the
# source PDF page).
_MANUAL_CHUNKS: List[dict] = [
    {
        "doc_id": "MAN-BRG-004",
        "title": "Bearing & Rotor Assembly — Section 4.2",
        "text": (
            "Elevated vibration on the X/Y axes combined with rising bearing "
            "housing temperature typically indicates lubrication film breakdown "
            "or early-stage bearing race pitting. Inspect grease consistency, "
            "check for metallic particulate in the drain sample, and verify "
            "shaft alignment with a laser alignment tool before re-lubricating."
        ),
        "fault_codes": ["ERR_BEARING_FRICTION"],
    },
    {
        "doc_id": "MAN-ELEC-091",
        "title": "Electrical Distribution Panel — Fault 91 Voltage Transients",
        "text": (
            "Voltage spikes on any phase (Va/Vb/Vc) exceeding 8% of nominal for "
            "more than 50ms are commonly caused by loose lug connections, a "
            "failing capacitor bank, or upstream utility switching transients. "
            "De-energize the affected feeder, torque-check all lugs, and megger "
            "test the capacitor bank before re-energizing."
        ),
        "fault_codes": ["ERR_VOLT_SPIKE_91"],
    },
    {
        "doc_id": "MAN-THERM-012",
        "title": "Thermal Management Subsystem — Overload Response",
        "text": (
            "Core temperature exceeding the rated thermal envelope for more than "
            "two consecutive readings indicates coolant flow restriction, fan "
            "bearing seizure, or an upstream process overload. Verify coolant "
            "pump differential pressure and inspect intake filters for fouling."
        ),
        "fault_codes": ["ERR_THERMAL_OVERLOAD"],
    },
    {
        "doc_id": "MAN-PWR-030",
        "title": "Load & Overcurrent Protection — Section 3.0",
        "text": (
            "Sustained overcurrent draw beyond the nameplate rating, without a "
            "corresponding increase in mechanical output, often points to "
            "winding insulation degradation or a mechanically jammed driven "
            "load. Check motor insulation resistance and inspect the coupled "
            "load for obstruction."
        ),
        "fault_codes": ["ERR_OVERCURRENT_LOAD"],
    },
    {
        "doc_id": "MAN-ACOU-055",
        "title": "Acoustic Telemetry & Noise Floor Baseline",
        "text": (
            "A rising noise floor with a falling signal-to-noise ratio usually "
            "reflects sensor mount looseness, cable shielding degradation, or "
            "the onset of cavitation in adjacent fluid handling equipment. "
            "Re-seat sensor mounts and inspect cable shielding continuity."
        ),
        "fault_codes": ["ERR_ACOUSTIC_ANOMALY", "ERR_SIGNAL_DEGRADATION"],
    },
    {
        "doc_id": "MAN-PC-001",
        "title": "Laptop/PC Monitoring — CPU Overload",
        "text": (
            "Sustained CPU usage near 100% for an extended period usually "
            "indicates a runaway process, insufficient cooling causing thermal "
            "throttling, or background tasks competing for resources. Check "
            "Activity Monitor / Task Manager for the top CPU consumer and "
            "confirm the fan and vents are not obstructed."
        ),
        "fault_codes": ["ERR_CPU_OVERLOAD"],
    },
    {
        "doc_id": "MAN-PC-002",
        "title": "Laptop/PC Monitoring — Memory Pressure",
        "text": (
            "High memory usage sustained over time can cause swapping to disk "
            "and noticeable slowdowns. Close unused applications and browser "
            "tabs, and check for a single process with an abnormally growing "
            "memory footprint, which usually indicates a memory leak."
        ),
        "fault_codes": ["ERR_MEMORY_PRESSURE"],
    },
    {
        "doc_id": "MAN-PC-003",
        "title": "Laptop/PC Monitoring — Disk I/O Saturation",
        "text": (
            "Unusually high disk read/write throughput sustained over time can "
            "indicate indexing, a large file transfer, backup software, or a "
            "failing drive retrying reads. Check background sync/backup tools "
            "and, if throughput stays high with no known cause, run a disk "
            "health check."
        ),
        "fault_codes": ["ERR_DISK_IO_SATURATION"],
    },
    {
        "doc_id": "MAN-PC-004",
        "title": "Laptop/PC Monitoring — Low Battery",
        "text": (
            "A rapidly falling battery percentage without charging active "
            "suggests the device should be connected to power soon to avoid "
            "an unplanned shutdown. If battery drains unusually fast even "
            "under light use, a battery health check is recommended."
        ),
        "fault_codes": ["ERR_LOW_BATTERY"],
    },
    {
        "doc_id": "MAN-PC-005",
        "title": "Laptop/PC Monitoring — Thermal Throttling",
        "text": (
            "When the operating system reduces CPU speed limit below 100%, "
            "it means the device is actively slowing itself down to avoid "
            "overheating. Common causes are blocked air vents, dust buildup "
            "in the fan, running on a soft surface like a bed or lap that "
            "blocks airflow, or heavy sustained load in a warm room. Clear "
            "vents, let the device rest on a hard flat surface, and reduce "
            "load until the speed limit returns to 100%."
        ),
        "fault_codes": ["ERR_LAPTOP_THERMAL_THROTTLE"],
    },
]


class ManualIndex:
    def __init__(self, chunks: List[dict]) -> None:
        self._chunks = chunks
        self._vectorizer = TfidfVectorizer(stop_words="english")
        self._matrix = self._vectorizer.fit_transform([c["text"] for c in chunks])

    def retrieve(self, fault_code: str, features: Dict[str, float], top_k: int = 2) -> List[ManualExcerpt]:
        # First, prefer exact fault-code matches (this is what a metadata filter
        # would do in a real vector DB before the similarity search).
        exact = [c for c in self._chunks if fault_code in c.get("fault_codes", [])]
        pool = exact or self._chunks

        query_text = fault_code + " " + " ".join(
            f"{k} {v:.2f}" for k, v in list(features.items())[:6]
        )
        query_vec = self._vectorizer.transform([query_text])
        pool_indices = [self._chunks.index(c) for c in pool]
        pool_matrix = self._matrix[pool_indices]
        sims = cosine_similarity(query_vec, pool_matrix)[0]

        ranked = sorted(zip(pool, sims), key=lambda x: x[1], reverse=True)[:top_k]
        return [
            ManualExcerpt(
                doc_id=chunk["doc_id"],
                title=chunk["title"],
                excerpt=chunk["text"],
                relevance=round(float(sim), 4),
            )
            for chunk, sim in ranked
        ]


manual_index = ManualIndex(_MANUAL_CHUNKS)
