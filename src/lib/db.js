import Dexie from 'dexie';

/**
 * @typedef {Object} SyncQueueItem
 * @property {number} [id]
 * @property {'animals' | 'growth_events' | 'services' | 'pregnancy_checks' | 'health_records'} table_name
 * @property {'INSERT' | 'UPDATE' | 'DELETE'} operation
 * @property {any} payload
 * @property {string} created_at
 * @property {'PENDING' | 'ERROR'} status
 * @property {string} [error_message]
 */

/**
 * @typedef {Object} Animal
 * @property {string} id
 * @property {string} user_id
 * @property {string} number
 * @property {string} [birth_date]
 * @property {'Macho' | 'Hembra'} [sex]
 * @property {'Activo' | 'Inactivo'} [status]
 * @property {string} [inactivity_reason]
 * @property {string} [photo_path]
 * @property {Blob} [photo_blob]
 * @property {string} [mother_id]
 * @property {string} [father_id]
 * @property {number} [birth_weight_kg]
 * @property {string} [origin_service_id]
 * @property {string} [color]
 * @property {string} [observations]
 * @property {number} [last_weight_kg]
 * @property {string} [last_weight_date]
 * @property {string} created_at
 * @property {string} updated_at
 * @property {string} [deleted_at]
 */

/**
 * @typedef {Object} Service
 * @property {string} id
 * @property {string} user_id
 * @property {string} mother_id
 * @property {string} [father_id]
 * @property {string} [type_conception]
 * @property {string} service_date
 * @property {string} created_at
 * @property {string} updated_at
 * @property {string} [deleted_at]
 */

/**
 * @typedef {Object} PregnancyCheck
 * @property {string} id
 * @property {string} user_id
 * @property {string} animal_id
 * @property {string} [service_id]
 * @property {string} check_date
 * @property {'Preñada' | 'Vacía'} result
 * @property {string} [observations]
 * @property {string} created_at
 * @property {string} updated_at
 * @property {string} [deleted_at]
 */

/**
 * @typedef {Object} HealthRecord
 * @property {string} id
 * @property {string} user_id
 * @property {string} animal_id
 * @property {string} [batch_id]
 * @property {'Vacuna' | 'Desparasitante' | 'Vitamina' | 'Antibiótico'} product_type
 * @property {string} product_name
 * @property {string} [dose]
 * @property {string} application_date
 * @property {string} created_at
 * @property {string} updated_at
 * @property {string} [deleted_at]
 */

/**
 * @typedef {Object} GrowthEvent
 * @property {string} id
 * @property {string} user_id
 * @property {string} animal_id
 * @property {string} event_type
 * @property {string} event_date
 * @property {number} [weight_kg]
 * @property {number} [mother_weight_kg]
 * @property {number} [scrotal_circumference_cm]
 * @property {string} [navel_length]
 * @property {string} [observations]
 * @property {string} [photo_path]
 * @property {Blob} [photo_blob]
 * @property {string} created_at
 * @property {string} updated_at
 * @property {string} [deleted_at]
 */

// ==========================================
// 2. CONFIGURACIÓN DE LA BASE DE DATOS DEXIE
// ==========================================

export class GanaderaDB extends Dexie {
    constructor() {
        super('GanaderaDB');

        // IMPORTANTE: Aquí NO van todas las columnas. 
        // Solo van: la llave primaria (id), y los campos por los que vamos a filtrar.
        this.version(1).stores({
            animals: 'id, user_id, number, mother_id, father_id, origin_service_id, updated_at, deleted_at',
            services: 'id, user_id, mother_id, father_id, service_date, updated_at, deleted_at',
            pregnancy_checks: 'id, user_id, animal_id, service_id, updated_at, deleted_at',
            health_records: 'id, user_id, animal_id, batch_id, updated_at, deleted_at',
            growth_events: 'id, user_id, animal_id, event_date, updated_at, deleted_at'
        });

        // Versión 2: Agregamos la cola de sincronización
        this.version(2).stores({
            sync_queue: '++id, table_name, status, created_at'
        });

        // Versión 3: Indexamos 'sex'
        this.version(3).stores({
            animals: 'id, user_id, number, sex, mother_id, father_id, origin_service_id, updated_at, deleted_at'
        });

        // Versión 4: Indexamos campos de peso
        this.version(4).stores({
            animals: 'id, user_id, number, sex, last_weight_kg, last_weight_date, mother_id, father_id, updated_at, deleted_at'
        });

        // --- FASE 1: NUEVA VERSIÓN 5 ---
        this.version(5).stores({
            animals: 'id, user_id, number, status, sex, last_weight_kg, last_weight_date, mother_id, father_id, updated_at, deleted_at'
        }).upgrade(tx => {
            return tx.table('animals').toCollection().modify(animal => {
                if (!animal.status) {
                    animal.status = 'Activo';
                }
            });
        });

        /** @type {Dexie.Table<Animal, string>} */
        this.animals = this.table('animals');
        /** @type {Dexie.Table<Service, string>} */
        this.services = this.table('services');
        /** @type {Dexie.Table<PregnancyCheck, string>} */
        this.pregnancy_checks = this.table('pregnancy_checks');
        /** @type {Dexie.Table<HealthRecord, string>} */
        this.health_records = this.table('health_records');
        /** @type {Dexie.Table<GrowthEvent, string>} */
        this.growth_events = this.table('growth_events');
        /** @type {Dexie.Table<SyncQueueItem, number>} */
        this.sync_queue = this.table('sync_queue');
    }
}

// Exportamos una única instancia para usarla en toda la app
export const db = new GanaderaDB();
