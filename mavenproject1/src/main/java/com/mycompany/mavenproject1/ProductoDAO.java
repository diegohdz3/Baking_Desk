package com.mycompany.mavenproject1;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class ProductoDAO {

    // ==========================================
    // SECCIÓN CATEGORÍAS
    // ==========================================
    public List<CategoriaProducto> listarCategorias() {
        List<CategoriaProducto> lista = new ArrayList<>();
        String sql = "SELECT * FROM Categoria_Producto";
        try (Connection con = ConexionBD.getConexion();
             PreparedStatement ps = con.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                lista.add(new CategoriaProducto(
                    rs.getInt("id_categoria"),
                    rs.getString("nombre"),
                    rs.getString("descripcion")
                ));
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return lista;
    }

    // ==========================================
    // SECCIÓN PRODUCTOS
    // ==========================================

    // 1. REGISTRAR PRODUCTO (Devuelve el ID generado para asociarle su receta sin error 500)
    public int registrar(Producto prod) {
        String sql = "INSERT INTO Producto (nombre, descripcion, precio, stock_actual, categoria_id, estado) VALUES (?, ?, ?, ?, ?, ?)";
        try (Connection con = ConexionBD.getConexion();
             PreparedStatement ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            
            ps.setString(1, prod.getNombre());
            ps.setString(2, prod.getDescripcion());
            ps.setDouble(3, prod.getPrecio());
            ps.setInt(4, prod.getStockActual());
            ps.setString(5, prod.getIdCategoria());
            ps.setString(6, prod.getEstado());

            int filasAfectadas = ps.executeUpdate();

            if (filasAfectadas > 0) {
                try (ResultSet rs = ps.getGeneratedKeys()) {
                    if (rs.next()) {
                        return rs.getInt(1); // Retorna el ID asignado por MySQL
                    }
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return -1; // Falló la inserción
    }

    // 2. LISTAR TODOS LOS PRODUCTOS
    public List<Producto> listarTodos() {
        List<Producto> lista = new ArrayList<>();
        String sql = "SELECT * FROM Producto";
        try (Connection con = ConexionBD.getConexion();
             PreparedStatement ps = con.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                lista.add(new Producto(
                    rs.getInt("id"), 
                    rs.getString("nombre"),
                    rs.getString("descripcion"),
                    rs.getDouble("precio"),
                    rs.getInt("stock_actual"),
                    rs.getString("categoria_id"),
                    rs.getString("estado")
                ));
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return lista;
    }

    // 3. BUSCAR PRODUCTO POR ID
    public Producto buscarPorId(int id) {
        String sql = "SELECT * FROM Producto WHERE id = ?";
        try (Connection con = ConexionBD.getConexion();
             PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setInt(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return new Producto(
                        rs.getInt("id"),
                        rs.getString("nombre"),
                        rs.getString("descripcion"),
                        rs.getDouble("precio"),
                        rs.getInt("stock_actual"),
                        rs.getString("categoria_id"),
                        rs.getString("estado")
                    );
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return null;
    }

    // 4. ACTUALIZAR PRODUCTO + RESTAR INGREDIENTES AUTOMÁTICAMENTE SI AUMENTA EL STOCK
    public boolean actualizar(Producto prod) {
        String sqlSelectStock = "SELECT stock_actual FROM Producto WHERE id = ?";
        String sqlUpdateProducto = "UPDATE Producto SET nombre = ?, descripcion = ?, precio = ?, stock_actual = ?, categoria_id = ?, estado = ? WHERE id = ?";
        String sqlReceta = "SELECT id_ingrediente, cantidad_necesaria FROM Receta WHERE id_producto = ?";
        String sqlRestarIngrediente = "UPDATE Ingrediente SET stock_actual = stock_actual - ? WHERE id = ?";
        String sqlMovimiento = "INSERT INTO Movimiento_Inventario (ingrediente_id, tipo, cantidad, motivo) VALUES (?, 'salida', ?, 'produccion_producto')";

        Connection con = null;
        try {
            con = ConexionBD.getConexion();
            con.setAutoCommit(false); // Transacción atómica

            // A) Obtener el stock anterior del producto
            int stockAnterior = 0;
            try (PreparedStatement psSel = con.prepareStatement(sqlSelectStock)) {
                psSel.setInt(1, prod.getIdProducto());
                ResultSet rs = psSel.executeQuery();
                if (rs.next()) {
                    stockAnterior = rs.getInt("stock_actual");
                }
            }

            int unidadesProducidas = prod.getStockActual() - stockAnterior;

            // B) Actualizar los datos del producto
            try (PreparedStatement psUpd = con.prepareStatement(sqlUpdateProducto)) {
                psUpd.setString(1, prod.getNombre());
                psUpd.setString(2, prod.getDescripcion());
                psUpd.setDouble(3, prod.getPrecio());
                psUpd.setInt(4, prod.getStockActual());
                psUpd.setString(5, prod.getIdCategoria());
                psUpd.setString(6, prod.getEstado());
                psUpd.setInt(7, prod.getIdProducto());
                psUpd.executeUpdate();
            }

            // C) Si se incrementó el stock del producto (> 0), descontar ingredientes de la Receta
            if (unidadesProducidas > 0) {
                try (PreparedStatement psReceta = con.prepareStatement(sqlReceta);
                     PreparedStatement psRestar = con.prepareStatement(sqlRestarIngrediente);
                     PreparedStatement psMov = con.prepareStatement(sqlMovimiento)) {

                    psReceta.setInt(1, prod.getIdProducto());
                    ResultSet rsReceta = psReceta.executeQuery();

                    while (rsReceta.next()) {
                        int idIngrediente = rsReceta.getInt("id_ingrediente");
                        double cantidadNecesaria = rsReceta.getDouble("cantidad_necesaria");
                        
                        double totalARestar = cantidadNecesaria * unidadesProducidas;

                        psRestar.setDouble(1, totalARestar);
                        psRestar.setInt(2, idIngrediente);
                        psRestar.addBatch();

                        psMov.setInt(1, idIngrediente);
                        psMov.setDouble(2, totalARestar);
                        psMov.addBatch();
                    }

                    psRestar.executeBatch();
                    psMov.executeBatch();
                }
            }

            con.commit(); // Confirmar cambios
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

    public boolean eliminar(int idProducto) {
        String sqlReceta = "DELETE FROM Receta WHERE producto_id = ?";
        String sqlDetalle = "DELETE FROM Detalle_Pedido WHERE producto_id = ?"; 
        String sqlProducto = "DELETE FROM Producto WHERE id = ?"; 

        try (Connection conn = ConexionBD.getConexion()) {
            conn.setAutoCommit(false);

            try (PreparedStatement stmt1 = conn.prepareStatement(sqlReceta)) {
                stmt1.setInt(1, idProducto);
                stmt1.executeUpdate();
            }

            try (PreparedStatement stmt2 = conn.prepareStatement(sqlDetalle)) {
                stmt2.setInt(1, idProducto);
                stmt2.executeUpdate();
            } catch (SQLException ignored) {
                System.err.println("Nota: No se pudo borrar de detalle_pedido: " + ignored.getMessage());
            }

            try (PreparedStatement stmt3 = conn.prepareStatement(sqlProducto)) {
                stmt3.setInt(1, idProducto);
                int filas = stmt3.executeUpdate();
                conn.commit();
                return filas > 0;
            } catch (SQLException e) {
                conn.rollback();
                throw e;
            }

        } catch (SQLException e) {
            System.err.println("Error crítico al eliminar: " + e.getMessage());
            return false;
        }
    }

// ==========================================
    // MÉTODO TRANSACCIONAL DE VENTAS (DESCUENTO DE STOCK PRODUCTO + ESTADO + FINANZAS)
    // ==========================================
    public boolean actualizarEstadoYGenerarIngreso(int pedidoId, String nuevoEstado) throws SQLException {
        String sqlPedidoInfo = "SELECT total FROM Pedido WHERE id = ?";
        String sqlDetalles = "SELECT dp.producto_id, dp.cantidad, p.nombre, p.stock_actual " +
                             "FROM Detalle_Pedido dp " +
                             "JOIN Producto p ON dp.producto_id = p.id " +
                             "WHERE dp.pedido_id = ?";
        String sqlDescontarStock = "UPDATE Producto SET stock_actual = stock_actual - ? WHERE id = ?";
        String updatePedidoSql = "UPDATE Pedido SET estado = ? WHERE id = ?";
        String insertIngresoSql = "INSERT INTO Ingreso (pedido_id, concepto, monto, fecha) VALUES (?, ?, ?, CURDATE())";

        Connection con = null;

        try {
            con = ConexionBD.getConexion();
            con.setAutoCommit(false); // 🔒 Inicio de transacción atómica

            String estadoLimpio = nuevoEstado != null ? nuevoEstado.replace("\"", "").trim() : "";

            // 1. SI SE MARCA COMO 'ENTREGADO', VALIDAR Y DESCONTAR STOCK DE PRODUCTOS
            if ("entregado".equalsIgnoreCase(estadoLimpio)) {

                // A) Obtener el total del pedido directamente de la base de datos
                double totalPedido = 0.0;
                try (PreparedStatement psP = con.prepareStatement(sqlPedidoInfo)) {
                    psP.setInt(1, pedidoId);
                    ResultSet rsP = psP.executeQuery();
                    if (rsP.next()) {
                        totalPedido = rsP.getDouble("total");
                    } else {
                        throw new SQLException("El pedido #" + pedidoId + " no existe.");
                    }
                }

                List<ItemDetalle> itemsParaDescontar = new ArrayList<>();

                // B) Buscar todos los productos que componen el pedido
                try (PreparedStatement psDetalles = con.prepareStatement(sqlDetalles)) {
                    psDetalles.setInt(1, pedidoId);
                    ResultSet rs = psDetalles.executeQuery();

                    while (rs.next()) {
                        int prodId = rs.getInt("producto_id");
                        int cantRequerida = rs.getInt("cantidad");
                        String nombreProd = rs.getString("nombre");
                        int stockActual = rs.getInt("stock_actual");

                        // FRENO DE SEGURIDAD: Verificar si hay suficiente stock
                        if (stockActual < cantRequerida) {
                            throw new SQLException("Stock insuficiente para '" + nombreProd + "'. Solicitados: " + cantRequerida + ", solo hay " + stockActual + " disponibles en stock.");
                        }

                        itemsParaDescontar.add(new ItemDetalle(prodId, cantRequerida));
                    }
                }

                // C) Restar las unidades del inventario de Productos
                try (PreparedStatement psDescuento = con.prepareStatement(sqlDescontarStock)) {
                    for (ItemDetalle item : itemsParaDescontar) {
                        psDescuento.setInt(1, item.cantidad);
                        psDescuento.setInt(2, item.productoId);
                        psDescuento.executeUpdate();
                    }
                }

                // D) Generar registro de Finanzas en la tabla Ingreso
                try (PreparedStatement psInsert = con.prepareStatement(insertIngresoSql)) {
                    psInsert.setInt(1, pedidoId);
                    psInsert.setString(2, "Pago automático de pedido #" + pedidoId);
                    psInsert.setDouble(3, totalPedido);
                    psInsert.executeUpdate();
                }
            }

            // 2. ACTUALIZAR EL ESTADO EN LA TABLA PEDIDO
            try (PreparedStatement psUpdate = con.prepareStatement(updatePedidoSql)) {
                psUpdate.setString(1, estadoLimpio);
                psUpdate.setInt(2, pedidoId);
                int filas = psUpdate.executeUpdate();
                if (filas == 0) {
                    throw new SQLException("No se encontró el pedido #" + pedidoId);
                }
            }

            con.commit(); // ✅ Confirmar la transacción
            return true;

        } catch (SQLException e) {
            if (con != null) {
                try { con.rollback(); } catch (SQLException ex) { ex.printStackTrace(); }
            }
            throw e; 
        } finally {
            if (con != null) {
                try { con.setAutoCommit(true); con.close(); } catch (SQLException ex) { ex.printStackTrace(); }
            }
        }
    }

    // Clase auxiliar interna para el recorrido de items del pedido
    private static class ItemDetalle {
        int productoId;
        int cantidad;

        ItemDetalle(int productoId, int cantidad) {
            this.productoId = productoId;
            this.cantidad = cantidad;
        }
    }
}