"""Constants and realistic catalogs for the toll synthetic dataset."""

from __future__ import annotations

from dataclasses import dataclass


# Vehicle plates - realistic state codes commonly seen in India
STATE_CODES: list[str] = [
    "MH",
    "DL",
    "RJ",
    "UP",
    "HR",
    "PB",
    "GJ",
    "KA",
    "TN",
    "WB",
    "KL",
    "TS",
    "AP",
    "OD",
    "CG",
    "AS",
    "BR",
    "MP",
    "UK",
    "JK",
    "CH",
]


VEHICLE_MAKES: list[str] = [
    "Maruti Suzuki",
    "Hyundai",
    "Tata",
    "Mahindra",
    "Toyota",
    "Honda",
    "Kia",
    "MG",
    "Skoda",
    "Volkswagen",
    "BMW",
    "Audi",
    "Mercedes-Benz",
]


VEHICLE_MODELS: list[str] = [
    "Swift",
    "Baleno",
    "Creta",
    "Venue",
    "i20",
    "Scorpio",
    "XUV700",
    "Harrier",
    "Safari",
    "Nexon",
    "Punch",
    "Fortuner",
    "City",
    "Amaze",
    "Seltos",
    "Innova Hycross",
]


VEHICLE_COLORS: list[str] = [
    "White",
    "Black",
    "Silver",
    "Grey",
    "Blue",
    "Red",
    "Brown",
    "Green",
    "Orange",
]


# Vehicle class heuristics (for more realistic alert distributions)
VEHICLE_TYPES: list[str] = ["2W", "3W", "Car", "SUV", "MPV", "Truck"]


TOLL_BASE_LANE_COUNTS = [2, 3, 4, 6, 8, 10]


# Realistic toll plaza seed list (name/state/coords approximations)
# Lat/long are approximate and for synthetic purposes only.


@dataclass(frozen=True, slots=True)
class TollPlaza:
    name: str
    state: str
    latitude: float
    longitude: float
    total_lanes: int
    active_lanes: int

    @property
    def risk_seed(self) -> int:
        # Used to derive risk score; deterministic by coords
        return int(abs(self.latitude * 10_000) + abs(self.longitude * 10_000)) % 101


TOLL_PLAZAS: list[TollPlaza] = [
    TollPlaza("Noida Toll Plaza", "Uttar Pradesh", 28.4864, 77.4425, 8, 6),
    TollPlaza("DND Flyway Toll Plaza", "Delhi", 28.5670, 77.2740, 6, 5),
    TollPlaza("Kherki Daula Toll Plaza", "Haryana", 28.3438, 77.0604, 10, 8),
    TollPlaza("Gurgaon Toll Plaza", "Haryana", 28.4500, 77.0400, 8, 7),
    TollPlaza("Tughlaqabad Toll Plaza", "Delhi", 28.5180, 77.2720, 6, 4),
    TollPlaza("Sonipat Toll Plaza", "Haryana", 29.0200, 77.0100, 6, 5),
    TollPlaza("Fatehpur Sikri Toll Plaza", "Uttar Pradesh", 27.2000, 77.7000, 4, 3),
    TollPlaza("Agra Expressway Toll Plaza", "Uttar Pradesh", 27.1767, 78.0081, 8, 6),
    TollPlaza("Mathura Toll Plaza", "Uttar Pradesh", 27.4920, 77.6730, 6, 5),
    TollPlaza("Ghaziabad Toll Plaza", "Uttar Pradesh", 28.6660, 77.4320, 10, 8),
    TollPlaza("Faridabad Toll Plaza", "Haryana", 28.4089, 77.3178, 6, 5),
    TollPlaza("Panchkula Toll Plaza", "Haryana", 30.7100, 76.8600, 4, 3),
    TollPlaza("Chandigarh Derabassi Toll Plaza", "Punjab", 30.6500, 76.7200, 6, 5),
    TollPlaza("Jalandhar Bypass Toll Plaza", "Punjab", 31.3260, 75.5790, 4, 3),
    TollPlaza("Ludhiana Doraha Toll Plaza", "Punjab", 30.7630, 75.9520, 6, 4),
    TollPlaza("Kharar Toll Plaza", "Punjab", 30.7250, 76.6090, 4, 3),
    TollPlaza("Delhi–Meerut Toll Plaza", "Uttar Pradesh", 28.9820, 77.4830, 8, 6),
    TollPlaza("Meerut Toll Plaza", "Uttar Pradesh", 28.9840, 77.7060, 6, 5),
    TollPlaza("Panipat Toll Plaza", "Haryana", 29.3880, 76.9860, 6, 4),
    TollPlaza("Ambala Toll Plaza", "Haryana", 30.3780, 76.7800, 8, 6),
    TollPlaza("Hissar Toll Plaza", "Haryana", 29.1490, 75.7210, 4, 3),
    TollPlaza("Ajmer Ring Toll Plaza", "Rajasthan", 26.8850, 74.6200, 6, 4),
    TollPlaza("Bhilwara Toll Plaza", "Rajasthan", 25.3530, 74.6400, 4, 3),
    TollPlaza("Jaipur Ring Toll Plaza", "Rajasthan", 26.9120, 75.7870, 10, 8),
    TollPlaza("Kota Toll Plaza", "Rajasthan", 25.1860, 75.8320, 6, 4),
    TollPlaza("Udaipur Toll Plaza", "Rajasthan", 24.5850, 73.7120, 4, 3),
    TollPlaza("Banswara Toll Plaza", "Rajasthan", 23.55, 74.43, 2, 2),
    TollPlaza("Ahmedabad Toll Plaza", "Gujarat", 23.0770, 72.6340, 10, 8),
    TollPlaza("Vadodara Toll Plaza", "Gujarat", 22.3070, 73.1810, 8, 6),
    TollPlaza("Surat Toll Plaza", "Gujarat", 21.1700, 72.8311, 8, 6),
    TollPlaza("Rajkot Toll Plaza", "Gujarat", 22.3030, 70.8020, 6, 5),
    TollPlaza("Bharuch Toll Plaza", "Gujarat", 21.7080, 73.0380, 4, 3),
    TollPlaza("Pune Expressway Toll Plaza", "Maharashtra", 18.5200, 73.8600, 8, 6),
    TollPlaza("Mumbai–Pune Toll Plaza", "Maharashtra", 19.1000, 72.8800, 10, 8),
    TollPlaza("Nagpur Toll Plaza", "Maharashtra", 21.1450, 79.0880, 6, 5),
    TollPlaza("Aurangabad Toll Plaza", "Maharashtra", 19.8760, 75.3430, 4, 3),
    TollPlaza("Kolhapur Toll Plaza", "Maharashtra", 16.6960, 74.2430, 2, 2),
    TollPlaza("Bengaluru Toll Plaza", "Karnataka", 12.9716, 77.5946, 8, 6),
    TollPlaza("Mysuru Toll Plaza", "Karnataka", 12.2958, 76.6394, 4, 3),
    TollPlaza("Hubli Toll Plaza", "Karnataka", 15.3647, 75.1230, 2, 2),
    TollPlaza("Hyderabad Toll Plaza", "Telangana", 17.3850, 78.4867, 10, 8),
    TollPlaza("Warangal Toll Plaza", "Telangana", 17.9680, 79.5940, 4, 3),
    TollPlaza("Vijayawada Toll Plaza", "Andhra Pradesh", 16.5062, 80.6480, 6, 5),
    TollPlaza("Visakhapatnam Toll Plaza", "Andhra Pradesh", 17.6868, 83.2185, 4, 3),
    TollPlaza("Chennai Outer Ring Toll Plaza", "Tamil Nadu", 13.0827, 80.2707, 10, 8),
    TollPlaza("Coimbatore Toll Plaza", "Tamil Nadu", 11.0168, 76.9558, 6, 5),
    TollPlaza("Madurai Toll Plaza", "Tamil Nadu", 9.9252, 78.1198, 4, 3),
    TollPlaza("Kochi Toll Plaza", "Kerala", 9.9312, 76.2673, 4, 3),
    TollPlaza("Kozhikode Toll Plaza", "Kerala", 11.2588, 75.7804, 2, 2),
    TollPlaza("Bhopal Toll Plaza", "Madhya Pradesh", 23.2599, 77.4126, 6, 5),
    TollPlaza("Indore Toll Plaza", "Madhya Pradesh", 22.7196, 75.8577, 8, 6),
    TollPlaza("Raipur Toll Plaza", "Chhattisgarh", 21.2514, 81.6296, 4, 3),
    TollPlaza("Jabalpur Toll Plaza", "Madhya Pradesh", 23.1815, 80.2084, 2, 2),
    TollPlaza("Ranchi Toll Plaza", "Jharkhand", 23.3441, 85.3096, 2, 2),
    TollPlaza("Durgapur Toll Plaza", "West Bengal", 23.5420, 87.2940, 4, 3),
    TollPlaza("Kharagpur Toll Plaza", "West Bengal", 22.3350, 87.3250, 2, 2),
    TollPlaza("Bhubaneswar Toll Plaza", "Odisha", 20.2961, 85.8245, 4, 3),
    TollPlaza("Cuttack Toll Plaza", "Odisha", 20.4633, 85.8816, 2, 2),
    TollPlaza("Guwahati Toll Plaza", "Assam", 26.1445, 91.7362, 4, 3),
    TollPlaza("Patna Toll Plaza", "Bihar", 25.5941, 85.1376, 4, 3),
    TollPlaza("Siliguri Toll Plaza", "West Bengal", 26.7268, 88.4386, 2, 2),
    # Add more names by systematic variants (still realistic style)
]

# Ensure 100+ plazas by expanding programmatically in plazas generator.


ALERT_TYPES: list[str] = [
    "FASTag Cloning",
    "Plate Spoofing",
    "Tailgating",
    "Watchlist Match",
    "Low Balance",
    "Fraud Detected",
    "Seat Belt Violation",
    "Wrong Lane",
    "Suspicious Vehicle",
    "Camera Offline",
]


ALERT_SEVERITIES: list[str] = ["Low", "Medium", "High", "Critical"]


CASE_TYPES: list[str] = [
    "Investigate FASTag Cloning",
    "Investigate Plate Spoofing",
    "Fraud Case",
    "Safety Violation",
    "Lane Violation",
    "Watchlist Review",
    "System Reliability",
]


EVIDENCE_FILE_TYPES: list[str] = ["image", "video", "csv", "log"]


NOTIFICATION_CATEGORIES: list[str] = [
    "AI Detection",
    "Fraud",
    "Security",
    "Camera",
    "Payment",
    "Emergency",
    "Maintenance",
    "System",
]


NOTIFICATION_ICON_MAP: dict[str, str] = {
    "AI Detection": "cpu",
    "Fraud": "shield-alert",
    "Security": "lock",
    "Camera": "camera",
    "Payment": "credit-card",
    "Emergency": "sirens",
    "Maintenance": "wrench",
    "System": "server",
}

