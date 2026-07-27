package com.mycompany.mavenproject1;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class RecetaDAO {

    // 1. Obtener la receta de un producto
    public List<Receta> obtenerPorProducto(int productoId) {
        List<Receta> lista = new ArrayList<>();
        String sql = "SELECT r.*, i.nombre AS nombre_ingrediente, i.unidad_medida " +
                     "FROM Receta r " +
                     "JOIN Ingrediente i ON r.ingrediente_id = i.id " +
                     "WHERE r.producto_id = ?";
        
        try (Connection con = ConexionBD.getConexion();
             PreparedStatement ps = con.prepareStatement(sql)) {
            
            ps.setInt(1, productoId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    lista.add(new Receta(
                        rs.getInt("id"),
                        rs.getInt("producto_id"),
                        rs.getInt("ingrediente_id"),
                        rs.getDouble("cantidad_requerida"),
                        rs.getString("unidad"),
                        rs.getString("nombre_ingrediente"),
                        rs.getString("unidad_medida")
                    ));
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return lista;
    }

    // 2. Guardar o Actualizar receta
    public boolean guardarReceta(int productoId, List<Receta> detallesReceta) {
        String sqlDelete = "DELETE FROM Receta WHERE producto_id = ?";
        String sqlInsert = "INSERT INTO Receta (producto_id, ingrediente_id, cantidad_requerida, unidad) VALUES (?, ?, ?, ?)";
        Connection con = null;

        try {
            con = ConexionBD.getConexion();
            con.setAutoCommit(false); // Transacción segura

            // Paso A: Limpiar receta previa del producto
            try (PreparedStatement psDel = con.prepareStatement(sqlDelete)) {
                psDel.setInt(1, productoId);
                psDel.executeUpdate();
            }

            // Paso B: Insertar la nueva lista de ingredientes
            if (detallesReceta != null && !detallesReceta.isEmpty()) {
                try (PreparedStatement psIns = con.prepareStatement(sqlInsert)) {
                    for (Receta item : detallesReceta) {
                        psIns.setInt(1, productoId);
                        psIns.setInt(2, item.getIngredienteId());
                        psIns.setDouble(3, item.getCantidadRequerida());
                        psIns.setString(4, item.getUnidad() != null ? item.getUnidad() : "");
                        psIns.addBatch();
                    }
                    psIns.executeBatch();
                }
            }

            con.commit();
            return true;

        } catch (SQLException e) {
            if (con != null) {
                try { con.rollback(); } catch (SQLException ex) { ex.printStackTrace(); }
            }
            e.printStackTrace();
            return false;
        } finally {
            if (con != null) {
                try { con.setAutoCommit(true); con.close(); } catch (SQLException e) { e.printStackTrace(); }
            }
        }
    }
}