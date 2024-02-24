const Recording = require("../models/recording");

const getRecordings = async (req, res) => {
    const { limit = 25, offset = 0, q } = req.query;
    const limitNumber = parseInt(limit);
    const query = q ? { $text: { $search: q } } : {};
    query.start = { $gt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000) };
    if (req.header('X-DISABLED') != 'true') {
        query.enabled = true;
    }
    
    const results = await Recording.aggregate([
        { $match: query }, // Etapa de filtrado
        {
            $group: {
                _id: { title: "$title", channel_name: "$channel_name" },
                recordings: { $push: "$$ROOT" },
                start: { $first: "$start" } // Nuevo campo para almacenar el start de cada grabación
            }
        },
        {
            $group: {
                _id: null,
                total: { $sum: 1 }, // Contar el total de grupos
                results: { $push: "$$ROOT" } // Recolectar los resultados de las agrupaciones
            }
        },
        { $unwind: "$results" }, // Desenrollar los resultados
        { $sort: { "results.start": 1 } }, // Ordenar los resultados por 'start'
        { $skip: parseInt(offset) }, // Aplicar el desplazamiento después de ordenar
        { $limit: limitNumber } // Aplicar el límite después de ordenar
    ]);

    const total = results.length > 0 ? results[0].total : 0; // Obtener el total del primer grupo si existen resultados

    const r = results.map(elem => {
        const { recordings } = elem.results;
        const { _id, ...other } = recordings[0]; // Eliminar _id que ya estamos usando como uid
        return {
            uid: _id,
            title: elem.results._id.title,
            channel_name: elem.results._id.channel_name,
            ...other,
            emissions: recordings
        };
    });

    res.json({
        recordings: r,
        paging: {
            page: Math.ceil(offset / limitNumber) + 1,
            total: Math.ceil(total / limitNumber),
        }
    });
}

module.exports = {
    getRecordings,
}