package com.mycompany.mavenproject1;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class ConexionBD {

    private static final String HOST = "localhost";
    private static final String PUERTO = "3306";
    private static final String BASE_DATOS = "bakingdesk_db";
    private static final String USUARIO = "root";
    private static final String PASSWORD = "Fernanflo0!";

    public static Connection getConexion() {
    Connection con = null;
    try {
        // Asegúrate de que el password sea una cadena vacía ""
        String url = "jdbc:mysql://localhost:3306/bakingdesk_db?useSSL=false";
        String user = "root";
        String password = ""; // AQUÍ ESTÁ EL CAMBIO: debe estar vacío
        con = DriverManager.getConnection(url, user, password);
    } catch (SQLException e) {
        e.printStackTrace();
    }
    return con;
}
    
}