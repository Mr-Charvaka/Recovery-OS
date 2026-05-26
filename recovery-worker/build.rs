fn main() {
    #[cfg(target_os = "windows")]
    {
        println!("cargo:rerun-if-changed=c_src/disk_win.c");
        println!("cargo:rerun-if-changed=c_src/disk_win.h");
        cc::Build::new()
            .file("c_src/disk_win.c")
            .compile("disk_win");
    }
}
