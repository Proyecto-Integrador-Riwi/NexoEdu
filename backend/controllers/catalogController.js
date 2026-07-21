// Controlador de catálogos de solo lectura (géneros, grados, estados, tipos
// de documento, localidades y barrios) que alimentan los formularios del front.
import * as CatalogModel from '../models/catalogModel.js';

// Todos los catálogos siguen el mismo patrón: consultar y devolver el
// arreglo, o 500 si algo falla a nivel de BD. No hay validación de negocio
// porque son operaciones de solo lectura sobre datos que el equipo
// administra directamente.

export async function generos(req, res) {
    try {
        res.json(await CatalogModel.obtenerGeneros());
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener géneros' });
    }
}

export async function grados(req, res) {
    try {
        res.json(await CatalogModel.obtenerGrados());
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener grados' });
    }
}

export async function estados(req, res) {
    try {
        res.json(await CatalogModel.obtenerEstados());
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener estados' });
    }
}

export async function tiposDocumento(req, res) {
    try {
        res.json(await CatalogModel.obtenerTiposDocumento());
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener tipos de documento' });
    }
}

export async function localidades(req, res) {
    try {
        res.json(await CatalogModel.obtenerLocalidades());
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener localidades' });
    }
}

// GET /api/catalogs/neighborhoods?locality_id=3 (locality_id es opcional)
export async function barrios(req, res) {
    try {
        const { locality_id } = req.query;
        res.json(await CatalogModel.obtenerBarrios(locality_id));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener barrios' });
    }
}
