"""Crea tablas, roles, permisos y el admin inicial.

    python seed.py          -> solo lo básico
    python seed.py --demo   -> además un guardián, un ciudadano, 2 rutas y 2 reportes de ejemplo
"""
import sys

from app.seed import init_db

if __name__ == "__main__":
    demo = "--demo" in sys.argv
    init_db(demo=demo)
    print("✔ Base de datos lista" + (" con datos de ejemplo." if demo else "."))
    if demo:
        print("  guardian@recoleccta.com / guardian123")
        print("  usuario@recoleccta.com  / usuario123")
