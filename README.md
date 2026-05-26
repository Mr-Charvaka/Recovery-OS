# FileRestorer Pro

FileRestorer Pro is a forensic-grade, hybrid-stack desktop utility designed for raw disk sector carving, structural filesystem metadata analysis (NTFS, FAT, exFAT, EXT4), and secure fragmentation reassembly.

It combines a high-performance **Vite/React frontend** running inside **Electron**, a native **Rust/C systems worker** for direct disk I/O operations, and a **Spring Boot enterprise server** for relational persistence and metric aggregation.

---

## 🏗️ Architecture Overview

The application is split into four distinct layers:

1. **Frontend Presentation**: A React + TypeScript user interface styled with a responsive brutalist layout, built with Vite and packaged via Electron.
2. **Native Abstraction**: A native C and Rust FFI layer (`CreateFileA`, `ReadFile`, POSIX raw file descriptors) that handles raw block access and sector-aligned reads.
3. **Rust Worker**: A high-performance CLI utility and HTTP REST server (`axum`) running system carving engines, Shannon entropy classification, and heuristics.
4. **Spring Boot Backend**: A secure Java microservice handling background queuing, metrics tracking, and relational metadata persistence using a file-backed local database.

---

## 🛠️ Prerequisites & Installation Guide

Before you can build and run this project, make sure your machine has the following tools installed. Below is a step-by-step setup guide for each prerequisite on Windows, macOS, and Linux.

---

### 1. Node.js (v18.0.0 or higher)

Node.js is the JavaScript runtime used to build and package the React frontend and run Electron.

*   **🪟 Windows**:
    1. Download the **LTS installer (`.msi`)** from the [Node.js Official Website](https://nodejs.org/).
    2. Run the installer and follow the wizard. Ensure the option to **"Add to PATH"** is checked.
    3. Restart your command prompt/terminal and verify: `node -v` and `npm -v`.
*   **🍎 macOS**:
    *   *Option A (Installer)*: Download the **macOS Installer (`.pkg`)** from the [Node.js Official Website](https://nodejs.org/) and run it.
    *   *Option B (Homebrew)*: Open Terminal and run:
        ```bash
        brew install node
        ```
*   **🐧 Linux**:
    *   *Debian/Ubuntu*:
        ```bash
        sudo apt update
        sudo apt install -y nodejs npm
        ```
    *   *Fedora/RHEL*:
        ```bash
        sudo dnf install -y nodejs
        ```

---

### 2. Rust & Cargo (v1.70.0 or higher)

Rust is the systems programming language used to build the high-performance system worker and system-level bindings.

*   **🪟 Windows**:
    1. Download `rustup-init.exe` from [rustup.rs](https://rustup.rs/).
    2. Run the executable. If prompted, select the default installation configuration (Option `1`).
    3. *Note: You must have Visual C++ Build Tools installed (see compilation section below) for Rust to link properly.*
*   **🍎 macOS & 🐧 Linux**:
    1. Open Terminal and run the official installation script:
       ```bash
       curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
       ```
    2. Follow the on-screen instructions. Once complete, reload your terminal profile:
       ```bash
       source $HOME/.cargo/env
       ```
    3. Verify the installation: `rustc --version` and `cargo --version`.

---

### 3. Java Development Kit (JDK 17)

JDK 17 is required to compile and run the Spring Boot relational database server.

*   **🪟 Windows**:
    1. Go to the [Eclipse Temurin Download Page](https://adoptium.net/temurin/releases/?version=17).
    2. Select **Windows**, **x64**, and download the **MSI Installer** for JDK 17.
    3. Run the installer. Ensure **"Set JAVA_HOME variable"** and **"Associate .jar files"** options are checked.
*   **🍎 macOS**:
    *   *Option A (Homebrew)*: Open Terminal and run:
        ```bash
        brew install openjdk@17
        ```
    *   *Option B (Installer)*: Download the **macOS Installer (`.pkg`)** for JDK 17 from [Adoptium](https://adoptium.net/) and run it.
*   **🐧 Linux**:
    *   *Debian/Ubuntu*:
        ```bash
        sudo apt update
        sudo apt install -y openjdk-17-jdk
        ```
    *   *Fedora/RHEL*:
        ```bash
        sudo dnf install -y java-17-openjdk-devel
        ```
    *   Verify the installation: `java -version` and `javac -version`.

---

### 4. Apache Maven (v3.8 or higher)

Maven is the build manager for the Java Spring Boot microservice.
*   **💡 Note for All Platforms**: A pre-configured local copy of Maven is already included in this repository under the [apache-maven-3.9.6](file:///d:/D/RESUME%20PROJECTS/Recovery/apache-maven-3.9.6) folder. You do not need to install it globally to run the project.
*   **If you prefer a global installation**:
    *   **🪟 Windows**: Download the binary zip from [Maven](https://maven.apache.org/download.cgi), extract it to `C:\Program Files`, and add the `bin` folder path to your system's Environment Variables `PATH`.
    *   **🍎 macOS**: Open Terminal and run: `brew install maven`.
    *   **🐧 Linux**:
        *   *Debian/Ubuntu*: `sudo apt install -y maven`
        *   *Fedora/RHEL*: `sudo dnf install -y maven`

---

### 5. C/C++ Compiler & Build Toolchains

The project compiles native C bindings (`napi-rs`) to execute raw drive sector-level disk access. You must install the platform compiler:

*   **🪟 Windows (MSVC)**:
    1. Download the **Visual Studio Installer** from [Visual Studio Downloads](https://visualstudio.microsoft.com/downloads/).
    2. Run it, and in the workloads tab, select **Desktop development with C++**.
    3. Click **Modify/Install** to download the compiler and SDK tools.
*   **🍎 macOS (Clang)**:
    1. Open Terminal and install the Xcode command-line utilities:
       ```bash
       xcode-select --install
       ```
*   **🐧 Linux (GCC/G++)**:
    *   *Debian/Ubuntu*:
        ```bash
        sudo apt update
        sudo apt install -y build-essential g++
        ```
    *   *Fedora/RHEL*:
        ```bash
        sudo dnf groupinstall -y "Development Tools" "Development Libraries"
        ```

---

## 🚀 Step-by-Step Local Setup

Follow these steps in order to install dependencies and run the application locally.

### Step 1: Clone the Repository
Open your terminal/command prompt and clone this repository:
```bash
git clone https://github.com/Mr-Charvaka/Recovery-OS.git
cd Recovery-OS
```

### Step 2: Install Node Dependencies
Install the package requirements for the frontend and Electron:
```bash
npm install
```

### Step 3: Build the Native C++ Node Addon
Build the system-level disk reader bindings:
```bash
npm run build:native
```

### Step 4: Run the Services

To run the full suite, you need to start three components (Vite/Electron, the Rust worker, and the Spring Boot backend):

#### 1. Start the Rust Worker (Port 8081)
The Rust worker handles raw sectors. Open a separate terminal, navigate to the worker directory, and launch it:
```bash
cd recovery-worker
cargo run
```
*(The terminal will show: `Rust native worker service listening on http://127.0.0.1:8081`)*

#### 2. Start the Spring Boot Server (Port 8080)
The Spring Boot server manages metrics and jobs. Open another terminal, navigate to the server, and compile/run it:
```bash
cd recovery-server
# Using the local Maven compiler:
../apache-maven-3.9.6/bin/mvn spring-boot:run
```
*(The server will start on `http://localhost:8080` and connect to the database)*

#### 3. Start the Electron Application (Port 5173)
Go back to your main project root directory and start the hot-reloading development server:
```bash
npm run dev
```

---

## 🔍 Testing Live Disk Scans (Administrator Mode)

By default, the application runs in **Storage Simulation Mode (Mock Mode)**. This simulates disk sectors using [mock_drive.raw](mock_drive.raw) so you can test the application safely without administrative locks or risk to host files.

To run a **Real Disk Scan**:
1. Run your terminal (Command Prompt/PowerShell on Windows, or Terminal on macOS/Linux) as **Administrator/root**.
2. Start the application scripts from this elevated terminal.
3. Open the application, go to **Settings**, toggle **Storage Simulation Mode (Mock)** to **OFF**, and click **Save Configuration**.
4. The scanner will now load and scan physical disk handles (e.g., `\\.\D:` or raw hardware controllers).

---

## 🧑‍💻 How to Contribute

We love contributions! If you are a newcomer:

1. **Fork** the repository and create your feature branch: `git checkout -b feature/amazing-feature`.
2. **Adding Custom Signatures**: You can register custom signatures dynamically without writing code! Just add a new JSON file to the `plugins` folder inside the app's user data directory (`C:\Users\<Name>\AppData\Roaming\filerestorer-pro\plugins`):
   ```json
   {
     "extension": "myext",
     "mime": "application/x-custom",
     "description": "My File Format",
     "magic": "594F5552484541444552", 
     "offset": 0,
     "footer": "594F5552464F4F544552",
     "category": "document"
   }
   ```
3. **Commit your changes**: Write semantic commit messages (`feat: ...`, `fix: ...`, `docs: ...`).
4. **Push** to the branch and open a **Pull Request**!
