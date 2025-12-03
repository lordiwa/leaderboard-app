#!/usr/bin/env python3
"""
Script de Migración - Sistema de Puntuación Competitivo
Migra datos del sistema antiguo (casual wins + torneos) al nuevo (W-L-D)

Uso:
    python migrate_scores.py --project-id leaderboard-app-9a315
"""

import argparse
import json
from datetime import datetime
from typing import Dict, List, Tuple
import firebase_admin
from firebase_admin import credentials, firestore


class ScoreMigration:
    def __init__(self, project_id: str, credentials_path: str = None):
        """
        Inicializar migración

        Args:
            project_id: ID del proyecto Firebase
            credentials_path: Ruta al archivo JSON de credenciales (opcional)
        """
        self.project_id = project_id

        # Inicializar Firebase
        if credentials_path:
            cred = credentials.Certificate(credentials_path)
            firebase_admin.initialize_app(cred)
        else:
            firebase_admin.initialize_app()

        self.db = firestore.client()
        self.migration_log = []

    def estimate_match_record(self,
                              casual_wins: int,
                              tournament_top4s: int) -> Tuple[int, int, int]:
        """
        Estimar el registro de partidas (W-L-D) basado en el sistema antiguo

        Args:
            casual_wins: Número de casual wins (cada una vale 2 pts)
            tournament_top4s: Número de top 4s en torneos

        Returns:
            Tupla de (wins, draws, losses)
        """
        # Asumir que los casual wins son todas victorias
        wins = casual_wins

        # Para los torneos, estimar distribución:
        # 1st: 20% (asumimos win)
        # 2nd: 30% (asumimos draw por competitividad)
        # 3rd: 30% (asumimos draw)
        # 4th: 20% (asumimos loss)
        tournament_wins = max(0, int(tournament_top4s * 0.2))
        tournament_draws = max(0, int(tournament_top4s * 0.3))
        tournament_losses = tournament_top4s - tournament_wins - tournament_draws

        total_wins = wins + tournament_wins
        total_draws = tournament_draws
        total_losses = tournament_losses

        return total_wins, total_draws, total_losses

    def calculate_new_points(self, wins: int, draws: int, losses: int) -> int:
        """
        Calcular puntos con nuevo sistema

        Args:
            wins: Victorias
            draws: Empates
            losses: Derrotas

        Returns:
            Total de puntos
        """
        return (wins * 3) + (draws * 1) + (losses * 0)

    def get_tier_from_points(self, points: int) -> str:
        """
        Obtener tier basado en puntos

        Args:
            points: Total de puntos

        Returns:
            Letra del tier (S, A, B, C, D, F)
        """
        tiers = [
            (150, 'S'),
            (120, 'A'),
            (85, 'B'),
            (50, 'C'),
            (25, 'D'),
            (0, 'F')
        ]

        for min_points, tier in tiers:
            if points >= min_points:
                return tier
        return 'F'

    def migrate_participant(self, doc_id: str, data: Dict) -> Dict:
        """
        Migrar un participante individual

        Args:
            doc_id: ID del documento en Firestore
            data: Datos del participante

        Returns:
            Diccionario con resultados de la migración
        """
        casual_wins = data.get('casualWins', 0)
        tournament_top4s = data.get('tournamentTop4s', 0)
        old_points = data.get('totalPoints', 0)

        # Estimar registro
        wins, draws, losses = self.estimate_match_record(casual_wins, tournament_top4s)

        # Calcular nuevos puntos
        new_points = self.calculate_new_points(wins, draws, losses)

        # Obtener categoría anterior y nueva
        old_category = data.get('category', 'F')
        new_category = self.get_tier_from_points(new_points)

        result = {
            'doc_id': doc_id,
            'name': data.get('name', 'Unknown'),
            'old_points': old_points,
            'new_points': new_points,
            'points_difference': new_points - old_points,
            'old_category': old_category,
            'new_category': new_category,
            'wins': wins,
            'draws': draws,
            'losses': losses,
            'casual_wins': casual_wins,
            'tournament_top4s': tournament_top4s,
            'migrated': False,
            'error': None
        }

        return result

    def preview_migration(self) -> List[Dict]:
        """
        Hacer una previa de la migración sin hacer cambios

        Returns:
            Lista de cambios propuestos
        """
        print("\n📋 PREVIEW DE MIGRACIÓN\n")

        participants_ref = self.db.collection('participants')
        participants = participants_ref.stream()

        preview_results = []
        total_points_change = 0

        for doc in participants:
            data = doc.to_dict()
            result = self.migrate_participant(doc.id, data)
            preview_results.append(result)
            total_points_change += result['points_difference']

            # Mostrar resumen
            emoji = '📈' if result['points_difference'] > 0 else '📉' if result['points_difference'] < 0 else '➡️'
            print(f"{emoji} {result['name']}")
            print(f"   Puntos: {result['old_points']} → {result['new_points']} ({result['points_difference']:+d})")
            print(f"   Tier: {result['old_category']} → {result['new_category']}")
            print(f"   Record: {result['wins']}W-{result['losses']}L-{result['draws']}D")
            print()

        print(f"\n📊 RESUMEN:")
        print(f"Total de participantes: {len(preview_results)}")
        print(f"Cambio total de puntos: {total_points_change:+d}")

        return preview_results

    def execute_migration(self, preview_results: List[Dict], dry_run: bool = True) -> bool:
        """
        Ejecutar la migración

        Args:
            preview_results: Resultados de la previa
            dry_run: Si es True, solo simular sin guardar cambios

        Returns:
            True si fue exitoso, False si hubo errores
        """
        if dry_run:
            print("\n🔄 DRY RUN - No se harán cambios reales\n")
        else:
            print("\n⚠️  EJECUTANDO MIGRACIÓN - Se modificarán los datos\n")

        participants_ref = self.db.collection('participants')
        successful = 0
        failed = 0

        for result in preview_results:
            try:
                if not dry_run:
                    # Actualizar documento
                    participants_ref.document(result['doc_id']).update({
                        'totalPoints': result['new_points'],
                        'category': result['new_category'],
                        'wins': result['wins'],
                        'draws': result['draws'],
                        'losses': result['losses'],
                        'migratedAt': firestore.SERVER_TIMESTAMP,
                        'migrationNotes': f"Migración automática: {result['wins']}W-{result['losses']}L-{result['draws']}D"
                    })

                    # Log en historial (opcional)
                    self.db.collection('pointHistory').add({
                        'participantId': result['doc_id'],
                        'participantName': result['name'],
                        'pointSource': 'migration',
                        'pointsChanged': result['points_difference'],
                        'previousPoints': result['old_points'],
                        'newPoints': result['new_points'],
                        'previousCategory': result['old_category'],
                        'newCategory': result['new_category'],
                        'migrationDetails': {
                            'wins': result['wins'],
                            'draws': result['draws'],
                            'losses': result['losses']
                        },
                        'timestamp': firestore.SERVER_TIMESTAMP,
                        'adminId': 'migration-script'
                    })

                result['migrated'] = True
                successful += 1
                print(f"✓ {result['name']}")

            except Exception as e:
                result['error'] = str(e)
                failed += 1
                print(f"✗ {result['name']}: {e}")

        print(f"\n✅ Exitosos: {successful}")
        print(f"❌ Fallidos: {failed}")

        return failed == 0

    def generate_report(self, preview_results: List[Dict], filename: str = None):
        """
        Generar reporte JSON de la migración

        Args:
            preview_results: Resultados de la migración
            filename: Nombre del archivo (default: migration_report_{timestamp}.json)
        """
        if filename is None:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f'migration_report_{timestamp}.json'

        report = {
            'timestamp': datetime.now().isoformat(),
            'project_id': self.project_id,
            'summary': {
                'total_participants': len(preview_results),
                'successful': sum(1 for r in preview_results if r.get('migrated', False)),
                'failed': sum(1 for r in preview_results if r.get('error')),
                'total_points_change': sum(r['points_difference'] for r in preview_results)
            },
            'results': preview_results
        }

        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)

        print(f"\n📄 Reporte guardado en: {filename}")
        return filename


def main():
    parser = argparse.ArgumentParser(
        description='Migrar sistema de puntuación a competitivo'
    )
    parser.add_argument('--project-id', required=True, help='ID del proyecto Firebase')
    parser.add_argument('--credentials', help='Ruta al archivo de credenciales JSON')
    parser.add_argument('--execute', action='store_true', help='Ejecutar migración (sin este flag solo hace preview)')
    parser.add_argument('--no-report', action='store_true', help='No generar reporte JSON')

    args = parser.parse_args()

    print(f"""
╔════════════════════════════════════════════════════════════╗
║     MIGRACIÓN - SISTEMA DE PUNTUACIÓN COMPETITIVO          ║
║                                                            ║
║  Antiguo: Casual (+2pts) | Tournament (8/7/6/5pts)        ║
║  Nuevo:   Victory (+3pts) | Draw (+1pt) | Loss (+0pts)    ║
╚════════════════════════════════════════════════════════════╝
    """)

    try:
        migration = ScoreMigration(args.project_id, args.credentials)

        # Hacer preview
        preview_results = migration.preview_migration()

        # Ejecutar si se especifica --execute
        if args.execute:
            response = input("\n¿Confirmar migración? (escribir 'sí' para confirmar): ")
            if response.lower() == 'sí':
                migration.execute_migration(preview_results, dry_run=False)
            else:
                print("Migración cancelada.")
        else:
            print("\n💡 Usar --execute para ejecutar la migración")
            print("   (ahora está en modo preview solamente)")

        # Generar reporte
        if not args.no_report:
            migration.generate_report(preview_results)

        print("\n✨ Migración completada!")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        return 1

    return 0


if __name__ == '__main__':
    exit(main())