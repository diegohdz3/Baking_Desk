package com.mycompany.mavenproject1;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class IngredienteDAO {

    // 1. CREAR ingrediente
    public boolean registrar(Ingrediente ing) {
        String sqlIngrediente = "INSERT INTO Ingrediente (nombre, idCategoria, stock_actual, stock_minimo, unidad_medida, costo) VALUES (?, ?, ?, ?, ?, ?)";
        String sqlGasto = "INSERT INTO Gasto (concepto, categoria_id, monto, fecha) VALUES (?, 1, ?, CURRENT_DATE())";

        Connection con = null;
        try {
            con = ConexionBD.getConexion();
            con.setAutoCommit(false);

            try (PreparedStatement psIng = con.prepareStatement(sqlIngrediente)) {
                psIng.setString(1, ing.getNombre());
                psIng.setString(2, ing.getIdCategoria());
                psIng.setDouble(3, ing.getStockActual());
                psIng.setDouble(4, ing.getStockMinimo());
                psIng.setString(5, ing.getUnidadMedida());
                psIng.setDouble(6, ing.getPrecioUnitario());
                psIng.executeUpdate();
            }

            double montoGastoInicial = ing.getPrecioUnitario();

            if (montoGastoInicial > 0) {
                try (PreparedStatement psGasto = con.prepareStatement(sqlGasto)) {
                    psGasto.setString(1, "Inventario inicial: " + ing.getNombre());
                    psGasto.setDouble(2, montoGastoInicial);
                    psGasto.executeUpdate();
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

    // 2. LEER todos
    public List<Ingrediente> listarTodos() {
        List<Ingrediente> lista = new ArrayList<>();
        String sql = "SELECT * FROM Ingrediente";
        try (Connection con = ConexionBD.getConexion();
             PreparedStatement ps = con.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {
            
            while (rs.next()) {
                lista.add(new Ingrediente(
                    rs.getInt("id"), 
                    rs.getString("nombre"),
                    rs.getString("idCategoria"), 
                    rs.getDouble("stock_actual"),
                    rs.getDouble("stock_minimo"),
                    rs.getString("unidad_medida"),
                    rs.getDouble("costo")
                ));
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return lista;
    }

    // 3. LEER por ID
    public Ingrediente buscarPorId(int id) {
        String sql = "SELECT * FROM Ingrediente WHERE id = ?"; 
        try (Connection con = ConexionBD.getConexion();
             PreparedStatement ps = con.prepareStatement(sql)) {
            
            ps.setInt(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return new Ingrediente(
                        rs.getInt("id"),
                        rs.getString("nombre"),
                        rs.getString("idCategoria"), 
                        rs.getDouble("stock_actual"),
                        rs.getDouble("stock_minimo"),
                        rs.getString("unidad_medida"),
                        rs.getDouble("costo")
                    );
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return null;
    }

    // 4. ACTUALIZAR
    public boolean actualizar(Ingrediente ing) {
        String sql = "UPDATE Ingrediente SET nombre = ?, idCategoria = ?, stock_actual = ?, stock_minimo = ?, unidad_medida = ?, costo = ? WHERE id = ?";
        try (Connection con = ConexionBD.getConexion();
             PreparedStatement ps = con.prepareStatement(sql)) {
            
            ps.setString(1, ing.getNombre());
            ps.setString(2, ing.getIdCategoria()); 
            ps.setDouble(3, ing.getStockActual());
            ps.setDouble(4, ing.getStockMinimo());
            ps.setString(5, ing.getUnidadMedida());
            ps.setDouble(6, ing.getPrecioUnitario());
            ps.setInt(7, ing.getIdIngrediente());
            
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            e.printStackTrace();
            return false;
        }
    }

    // 5. ELIMINAR
    public boolean eliminar(int id) {
        String sqlDisableFK = "SET FOREIGN_KEY_CHECKS = 0;";
        String sqlEnableFK = "SET FOREIGN_KEY_CHECKS = 1;";
        String sqlDelete = "DELETE FROM Ingrediente WHERE id = ?";

        try (Connection con = ConexionBD.getConexion()) {
            con.setAutoCommit(false);

            try (Statement stmtFK = con.createStatement();
                 PreparedStatement stmt = con.prepareStatement(sqlDelete)) {

                stmtFK.execute(sqlDisableFK);
                stmt.setInt(1, id);
                int filasAfectadas = stmt.executeUpdate();
                stmtFK.execute(sqlEnableFK);

                con.commit();
                return filasAfectadas > 0;

            } catch (SQLException e) {
                con.rollback();
                System.err.println("Error al eliminar ingrediente ID " + id + ": " + e.getMessage());
                return false;
            }
        } catch (SQLException e) {
            System.err.println("Error de conexión: " + e.getMessage());
            return false;
        }
    }

    // 6. SURTIR STOCK
    public boolean registrarCompraIngrediente(int ingredienteId, double cantidadComprada, double costoIngresado, int usuarioId, int categoriaGastoId) {
        String sqlGasto = "INSERT INTO Gasto (concepto, categoria_id, monto, fecha) VALUES (?, ?, ?, CURRENT_DATE())";
        String sqlUpdateStock = "UPDATE Ingrediente SET stock_actual = stock_actual + ?, costo = ? WHERE id = ?";
        String sqlMovimiento = "INSERT INTO Movimiento_Inventario (ingrediente_id, tipo, cantidad, motivo, usuario_id) VALUES (?, 'entrada', ?, 'compra', ?)";

        Connection con = null;
        try {
            con = ConexionBD.getConexion();
            con.setAutoCommit(false);

            Ingrediente ing = buscarPorId(ingredienteId);
            if (ing == null) {
                con.rollback();
                return false;
            }

            // 1. Registrar el gasto con el costo exacto
            try (PreparedStatement psGasto = con.prepareStatement(sqlGasto)) {
                psGasto.setString(1, "Compra de ingrediente: " + ing.getNombre());
                psGasto.setInt(2, categoriaGastoId);
                psGasto.setDouble(3, costoIngresado);
                psGasto.executeUpdate();
            }

            // 2. Actualizar stock y SOBREESCRIBIR el costo con lo que escribiste manualmente
            try (PreparedStatement psStock = con.prepareStatement(sqlUpdateStock)) {
                psStock.setDouble(1, cantidadComprada);
                psStock.setDouble(2, costoIngresado); // 👈 ¡AQUÍ ESTÁ LA MAGIA! Se guarda directo, sin dividir
                psStock.setInt(3, ingredienteId);
                psStock.executeUpdate();
            }

            // 3. Registrar el movimiento en inventario
            try (PreparedStatement psMov = con.prepareStatement(sqlMovimiento)) {
                psMov.setInt(1, ingredienteId);
                psMov.setDouble(2, cantidadComprada);
                psMov.setInt(3, usuarioId);
                psMov.executeUpdate();
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

    // 7. 🔥 RESTAR MATERIA PRIMA AL PRODUCIR / CREAR PRODUCTOS
    public boolean descontarMateriaPrimaPorProducto(int idProducto, double cantidadProductoProducida, int usuarioId) {
        String sqlReceta = "SELECT id_ingrediente, cantidad_necesaria FROM Receta WHERE id_producto = ?";
        String sqlRestarStock = "UPDATE Ingrediente SET stock_actual = stock_actual - ? WHERE id = ?";
        String sqlMovimiento = "INSERT INTO Movimiento_Inventario (ingrediente_id, tipo, cantidad, motivo, usuario_id) VALUES (?, 'salida', ?, 'produccion_producto', ?)";

        Connection con = null;
        try {
            con = ConexionBD.getConexion();
            con.setAutoCommit(false);

            // 1. Obtener la receta asociada al producto
            try (PreparedStatement psReceta = con.prepareStatement(sqlReceta)) {
                psReceta.setInt(1, idProducto);
                ResultSet rs = psReceta.executeQuery();

                try (PreparedStatement psRestar = con.prepareStatement(sqlRestarStock);
                     PreparedStatement psMov = con.prepareStatement(sqlMovimiento)) {

                    while (rs.next()) {
                        int idIngrediente = rs.getInt("id_ingrediente");
                        double cantidadPorUnidad = rs.getDouble("cantidad_necesaria");
                        double totalARestar = cantidadPorUnidad * cantidadProductoProducida;

                        // Restar de la tabla Ingrediente
                        psRestar.setDouble(1, totalARestar);
                        psRestar.setInt(2, idIngrediente);
                        psRestar.addBatch();

                        // Auditoría de salida en inventario
                        psMov.setInt(1, idIngrediente);
                        psMov.setDouble(2, totalARestar);
                        psMov.setInt(3, usuarioId);
                        psMov.addBatch();
                    }

                    psRestar.executeBatch();
                    psMov.executeBatch();
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
    // 8. ⚠️ OBTENER INGREDIENTES EN STOCK CRÍTICO (Para las alertas automáticas)
    public List<Ingrediente> obtenerIngredientesCriticos() {
        List<Ingrediente> lista = new ArrayList<>();
        // Buscamos los que ya cruzaron la línea del stock mínimo
        String sql = "SELECT * FROM Ingrediente WHERE stock_actual <= stock_minimo";
        
        try (Connection con = ConexionBD.getConexion();
             PreparedStatement ps = con.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {
            
            while (rs.next()) {
                lista.add(new Ingrediente(
                    rs.getInt("id"), 
                    rs.getString("nombre"),
                    rs.getString("idCategoria"), 
                    rs.getDouble("stock_actual"),
                    rs.getDouble("stock_minimo"),
                    rs.getString("unidad_medida"),
                    rs.getDouble("costo")
                ));
            }
        } catch (SQLException e) {
            System.err.println("Error al buscar stock crítico: " + e.getMessage());
            e.printStackTrace();
        }
        return lista;
    }
    // ==========================================
    // 9. 🔥 RESTAR MATERIA PRIMA AUTOMÁTICAMENTE DE UN PEDIDO COMPLETO
    // ==========================================
    public boolean descontarMateriaPrimaPorPedido(int idPedido, int usuarioId) {
        // Consulta que une el Detalle del Pedido con las Recetas para calcular la materia prima total requerida
        String sqlItemsReceta = 
            "SELECT r.id_ingrediente, SUM(r.cantidad_necesaria * dp.cantidad) AS total_necesario " +
            "FROM Detalle_Pedido dp " +
            "JOIN Receta r ON dp.producto_id = r.id_producto " +
            "WHERE dp.pedido_id = ? " +
            "GROUP BY r.id_ingrediente";

        String sqlRestarStock = "UPDATE Ingrediente SET stock_actual = stock_actual - ? WHERE id = ?";
        String sqlMovimiento = "INSERT INTO Movimiento_Inventario (ingrediente_id, tipo, cantidad, motivo, usuario_id) VALUES (?, 'salida', ?, ?, ?)";

        Connection con = null;
        try {
            con = ConexionBD.getConexion();
            con.setAutoCommit(false);

            try (PreparedStatement psItems = con.prepareStatement(sqlItemsReceta)) {
                psItems.setInt(1, idPedido);
                ResultSet rs = psItems.executeQuery();

                try (PreparedStatement psRestar = con.prepareStatement(sqlRestarStock);
                     PreparedStatement psMov = con.prepareStatement(sqlMovimiento)) {

                    boolean hayIngredientes = false;

                    while (rs.next()) {
                        hayIngredientes = true;
                        int idIngrediente = rs.getInt("id_ingrediente");
                        double totalARestar = rs.getDouble("total_necesario");

                        // 1. Restar de la tabla Ingrediente
                        psRestar.setDouble(1, totalARestar);
                        psRestar.setInt(2, idIngrediente);
                        psRestar.addBatch();

                        // 2. Registrar movimiento de inventario (Auditoría)
                        psMov.setInt(1, idIngrediente);
                        psMov.setDouble(2, totalARestar);
                        psMov.setString(3, "Producción Pedido #" + idPedido);
                        psMov.setInt(4, usuarioId);
                        psMov.addBatch();
                    }

                    if (hayIngredientes) {
                        psRestar.executeBatch();
                        psMov.executeBatch();
                    }
                }
            }

            con.commit();
            return true;

        } catch (SQLException e) {
            if (con != null) {
                try { con.rollback(); } catch (SQLException ex) { ex.printStackTrace(); }
            }
            System.err.println("Error al descontar materia prima del Pedido #" + idPedido + ": " + e.getMessage());
            return false;
        } finally {
            if (con != null) {
                try { con.setAutoCommit(true); con.close(); } catch (SQLException e) { e.printStackTrace(); }
            }
        }
    }
}